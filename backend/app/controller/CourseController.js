import CourseSchema from "../modules/courseModule.js";
import TeacherSchema from "../modules/teacherModule.js";
import BatchSchema from "../modules/batchModule.js";
import EnrollmentSchema from "../modules/enrollmentModule.js";
import mongoose from "mongoose";
import * as XLSX from "xlsx";

const toNum = (value) => Math.max(0, Number(value) || 0);

const calculateTotalFee = (data = {}) =>
  toNum(data.admissionFee) +
  toNum(data.courseFee) +
  toNum(data.certificateFee) +
  toNum(data.examFee) +
  toNum(data.registrationFee) +
  toNum(data.practicalFee) +
  toNum(data.otherFee);

const normalizeBatchIds = (batchIds) =>
  Array.isArray(batchIds)
    ? batchIds.filter((id) => typeof id === "string" && id.trim())
    : [];

const normalizeText = (value) => String(value || "").trim();

const getRowValue = (row, keys = []) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
      return row[key];
    }
  }
  return null;
};

const getSheetRowsByNames = (workbook, names = []) => {
  const match = workbook.SheetNames.find((sheetName) =>
    names.some((name) => sheetName.toLowerCase() === name.toLowerCase()),
  );

  if (!match) return null;

  return XLSX.utils.sheet_to_json(workbook.Sheets[match], {
    defval: "",
    raw: false,
  });
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  const normalized = normalizeText(value).toLowerCase();
  return ["true", "yes", "1", "y"].includes(normalized);
};

const parseTeacherRefs = (value) =>
  normalizeText(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const assignBatchesToCourse = async (courseId, batchIds = []) => {
  const normalizedBatchIds = normalizeBatchIds(batchIds);
  if (normalizedBatchIds.length === 0) {
    return [];
  }

  const batches = await BatchSchema.find({
    _id: { $in: normalizedBatchIds },
  });

  if (batches.length !== normalizedBatchIds.length) {
    throw new Error("One or more selected batches are invalid");
  }

  await BatchSchema.updateMany(
    { _id: { $in: normalizedBatchIds } },
    { $set: { course: courseId } },
  );

  return normalizedBatchIds;
};

const attachCourseUsageStats = async (courses = []) => {
  if (!courses.length) {
    return [];
  }

  const courseIds = courses.map((course) => course._id);

  const [enrollmentCounts, batchCounts] = await Promise.all([
    EnrollmentSchema.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $lookup: {
          from: "admissions",
          localField: "student",
          foreignField: "_id",
          as: "studentRecord",
        },
      },
      { $unwind: "$studentRecord" },
      {
        $match: {
          "studentRecord.isActive": true,
          status: { $in: ["Active", "Completed", "On Hold"] },
        },
      },
      {
        $group: {
          _id: "$course",
          enrolledStudentsCount: { $sum: 1 },
        },
      },
    ]),
    BatchSchema.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: "$course",
          linkedBatchesCount: { $sum: 1 },
          morningBatchesCount: {
            $sum: {
              $cond: [{ $eq: ["$shift", "Morning"] }, 1, 0],
            },
          },
          eveningBatchesCount: {
            $sum: {
              $cond: [{ $eq: ["$shift", "Evening"] }, 1, 0],
            },
          },
        },
      },
    ]),
  ]);

  const enrollmentMap = new Map(
    enrollmentCounts.map((item) => [String(item._id), item.enrolledStudentsCount]),
  );
  const batchMap = new Map(
    batchCounts.map((item) => [String(item._id), item.linkedBatchesCount]),
  );
  const batchShiftMap = new Map(
    batchCounts.map((item) => [
      String(item._id),
      {
        Morning: item.morningBatchesCount || 0,
        Evening: item.eveningBatchesCount || 0,
      },
    ]),
  );

  return courses.map((course) => {
    const plainCourse =
      typeof course.toObject === "function" ? course.toObject() : course;

    return {
      ...plainCourse,
      enrolledStudentsCount: enrollmentMap.get(String(plainCourse._id)) || 0,
      linkedBatchesCount: batchMap.get(String(plainCourse._id)) || 0,
      linkedBatchesCountByShift: batchShiftMap.get(String(plainCourse._id)) || {
        Morning: 0,
        Evening: 0,
      },
    };
  });
};

const createCourse = async (req, res) => {
  try {
    const {
      courseId,
      courseName,
      duration,
      admissionFee,
      courseFee,
      certificateFee,
      examFee,
      registrationFee,
      practicalFee,
      otherFee,
      includeExamFeeInInstallments,
      includeRegistrationFeeInInstallments,
      includePracticalFeeInInstallments,
      includeOtherFeeInInstallments,
      teacherId, // Array of teacher IDs
      batchIds,
    } = req.body;

    // Check required fields
    if (!courseId || !courseName || !duration) {
      return res.status(400).json({
        success: false,
        message:
          "All required fields must be provided (courseId, courseName, duration)",
      });
    }

    // Check if course already exists
    const existingCourse = await CourseSchema.findOne({ courseId });
    if (existingCourse) {
      return res.status(409).json({
        success: false,
        message: "Course with this courseId already exists",
      });
    }

    // Validate teachers if provided
    if (teacherId && teacherId.length > 0) {
      console.log("⚠️ Received teacher IDs:", teacherId);

      // Convert string IDs to ObjectIds
      const objectIdTeachers = teacherId.map(
        (id) => new mongoose.Types.ObjectId(id),
      );

      const teachers = await TeacherSchema.find({
        _id: { $in: objectIdTeachers },
      });
      console.log(
        "✅ Found teachers:",
        teachers.length,
        "Expected:",
        teacherId.length,
      );

      if (teachers.length !== teacherId.length) {
        return res.status(400).json({
          success: false,
          message: `One or more teacher IDs are invalid. Received: ${teacherId.length}, Found: ${teachers.length}`,
        });
      }
    }

    //  Create new course
    const newCourse = new CourseSchema({
      courseId,
      courseName,
      duration,
      admissionFee: toNum(admissionFee),
      courseFee: toNum(courseFee),
      certificateFee: toNum(certificateFee),
      examFee: toNum(examFee),
      registrationFee: toNum(registrationFee),
      practicalFee: toNum(practicalFee),
      otherFee: toNum(otherFee),
      includeExamFeeInInstallments: Boolean(includeExamFeeInInstallments),
      includeRegistrationFeeInInstallments: Boolean(
        includeRegistrationFeeInInstallments,
      ),
      includePracticalFeeInInstallments: Boolean(
        includePracticalFeeInInstallments,
      ),
      includeOtherFeeInInstallments: Boolean(includeOtherFeeInInstallments),
      totalFee: calculateTotalFee({
        admissionFee,
        courseFee,
        certificateFee,
        examFee,
        registrationFee,
        practicalFee,
        otherFee,
      }),
      teacherId: teacherId || [],
    });

    //  Save to database
    const savedCourse = await newCourse.save();

    await assignBatchesToCourse(savedCourse._id, batchIds);

    // Update teachers' courseId array
    if (teacherId && teacherId.length > 0) {
      await TeacherSchema.updateMany(
        { _id: { $in: teacherId } },
        { $addToSet: { courseId: savedCourse._id } },
      );
    }

    // Populate teacher details
    const populatedCourse = await CourseSchema.findById(
      savedCourse._id,
    ).populate("teacherId", "teacherId fullName contactNo");

    // Success response
    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: populatedCourse,
    });
  } catch (error) {
    // Error handling
    res.status(500).json({
      success: false,
      message: "Server error while creating course",
      error: error.message,
    });
  }
};

// Get all courses with teacher details
export const getAllCourses = async (req, res) => {
  try {
    const courses = await CourseSchema.find()
      .populate(
        "teacherId",
        "teacherId fullName contactNo profilePicture gender specialization",
      )
      .sort({ createdAt: -1 });

    const coursesWithStats = await attachCourseUsageStats(courses);

    res.status(200).json({
      success: true,
      message: "Courses retrieved successfully",
      data: coursesWithStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while retrieving courses",
      error: error.message,
    });
  }
};

// Get course by ID
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await CourseSchema.findById(id).populate(
      "teacherId",
      "teacherId fullName contactNo gender appointmentDate",
    );

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const [courseWithStats] = await attachCourseUsageStats([course]);

    res.status(200).json({
      success: true,
      message: "Course retrieved successfully",
      data: courseWithStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while retrieving course",
      error: error.message,
    });
  }
};

// Update course
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      courseId,
      courseName,
      courseCategory,
      duration,
      admissionFee,
      courseFee,
      certificateFee,
      examFee,
      registrationFee,
      practicalFee,
      otherFee,
      includeExamFeeInInstallments,
      includeRegistrationFeeInInstallments,
      includePracticalFeeInInstallments,
      includeOtherFeeInInstallments,
      teacherId,
      batchIds,
    } = req.body;

    const course = await CourseSchema.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Validate teachers if provided
    if (teacherId && teacherId.length > 0) {
      // Convert string IDs to ObjectIds
      const objectIdTeachers = teacherId.map(
        (id) => new mongoose.Types.ObjectId(id),
      );
      const teachers = await TeacherSchema.find({
        _id: { $in: objectIdTeachers },
      });
      if (teachers.length !== teacherId.length) {
        return res.status(400).json({
          success: false,
          message: "One or more teacher IDs are invalid",
        });
      }
    }

    // Remove course from old teachers
    if (course.teacherId && course.teacherId.length > 0) {
      await TeacherSchema.updateMany(
        { _id: { $in: course.teacherId } },
        { $pull: { courseId: course._id } },
      );
    }

    // Update course
    const updateData = {
      courseId: courseId || course.courseId,
      courseName: courseName || course.courseName,
      courseCategory: courseCategory || course.courseCategory,
      duration: duration || course.duration,
      admissionFee:
        admissionFee !== undefined ? toNum(admissionFee) : course.admissionFee,
      courseFee: courseFee !== undefined ? toNum(courseFee) : course.courseFee,
      certificateFee:
        certificateFee !== undefined
          ? toNum(certificateFee)
          : course.certificateFee,
      examFee: examFee !== undefined ? toNum(examFee) : course.examFee,
      registrationFee:
        registrationFee !== undefined
          ? toNum(registrationFee)
          : course.registrationFee,
      practicalFee:
        practicalFee !== undefined ? toNum(practicalFee) : course.practicalFee,
      otherFee: otherFee !== undefined ? toNum(otherFee) : course.otherFee,
      includeExamFeeInInstallments:
        includeExamFeeInInstallments !== undefined
          ? Boolean(includeExamFeeInInstallments)
          : course.includeExamFeeInInstallments,
      includeRegistrationFeeInInstallments:
        includeRegistrationFeeInInstallments !== undefined
          ? Boolean(includeRegistrationFeeInInstallments)
          : course.includeRegistrationFeeInInstallments,
      includePracticalFeeInInstallments:
        includePracticalFeeInInstallments !== undefined
          ? Boolean(includePracticalFeeInInstallments)
          : course.includePracticalFeeInInstallments,
      includeOtherFeeInInstallments:
        includeOtherFeeInInstallments !== undefined
          ? Boolean(includeOtherFeeInInstallments)
          : course.includeOtherFeeInInstallments,
      teacherId: teacherId !== undefined ? teacherId : course.teacherId,
    };
    updateData.totalFee = calculateTotalFee(updateData);

    const updatedCourse = await CourseSchema.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("teacherId", "teacherId fullName contactNo");

    await assignBatchesToCourse(updatedCourse._id, batchIds);

    // Add course to new teachers
    if (teacherId && teacherId.length > 0) {
      await TeacherSchema.updateMany(
        { _id: { $in: teacherId } },
        { $addToSet: { courseId: updatedCourse._id } },
      );
    }

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while updating course",
      error: error.message,
    });
  }
};

// Delete course
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await CourseSchema.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Remove course from teachers
    if (course.teacherId && course.teacherId.length > 0) {
      await TeacherSchema.updateMany(
        { _id: { $in: course.teacherId } },
        { $pull: { courseId: course._id } },
      );
    }

    await CourseSchema.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while deleting course",
      error: error.message,
    });
  }
};

export const bulkImportCoursesWorkbook = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: true,
    });

    const coursesSheet =
      getSheetRowsByNames(workbook, ["Courses", "Course"]) || [];
    const batchesSheet =
      getSheetRowsByNames(workbook, ["Batches", "Batch"]) || [];

    if (!coursesSheet.length && !batchesSheet.length) {
      return res.status(400).json({
        success: false,
        message: "No course or batch data found in the workbook",
      });
    }

    const teachers = await TeacherSchema.find({}, "_id teacherId fullName").lean();
    const teacherLookup = new Map();
    teachers.forEach((teacher) => {
      teacherLookup.set(String(teacher._id), teacher._id);
      teacherLookup.set(normalizeText(teacher.teacherId).toLowerCase(), teacher._id);
      teacherLookup.set(normalizeText(teacher.fullName).toLowerCase(), teacher._id);
    });

    const results = {
      coursesImported: 0,
      coursesUpdated: 0,
      batchesImported: 0,
      batchesUpdated: 0,
      errors: [],
    };

    const courseMap = new Map();

    const existingCourses = await CourseSchema.find({}, "_id courseId courseName").lean();
    existingCourses.forEach((course) => {
      courseMap.set(normalizeText(course.courseId).toLowerCase(), String(course._id));
      courseMap.set(normalizeText(course.courseName).toLowerCase(), String(course._id));
    });

    for (let index = 0; index < coursesSheet.length; index += 1) {
      const row = coursesSheet[index];
      const rowNumber = index + 2;

      try {
        const courseId = normalizeText(getRowValue(row, ["Course ID", "courseId"]));
        const courseName = normalizeText(
          getRowValue(row, ["Course Name", "courseName"]),
        );
        const duration = Number(getRowValue(row, ["Duration", "duration"]) || 0);

        if (!courseId || !courseName || !duration) {
          throw new Error("Missing required course fields");
        }

        const teacherRefs = parseTeacherRefs(
          getRowValue(row, ["Teacher IDs", "Teacher Names", "teacherId"]),
        );
        const resolvedTeacherIds = teacherRefs
          .map((ref) => teacherLookup.get(ref.toLowerCase()) || teacherLookup.get(ref))
          .filter(Boolean);

        const coursePayload = {
          courseId,
          courseName,
          courseCategory:
            normalizeText(
              getRowValue(row, ["Course Category", "courseCategory"]),
            ) || "IT & Vocational",
          duration,
          admissionFee: toNum(getRowValue(row, ["Admission Fee", "admissionFee"])),
          courseFee: toNum(getRowValue(row, ["Course Fee", "courseFee"])),
          certificateFee: toNum(
            getRowValue(row, ["Certificate Fee", "certificateFee"]),
          ),
          examFee: toNum(getRowValue(row, ["Exam Fee", "examFee"])),
          registrationFee: toNum(
            getRowValue(row, ["Registration Fee", "registrationFee"]),
          ),
          practicalFee: toNum(getRowValue(row, ["Practical Fee", "practicalFee"])),
          otherFee: toNum(getRowValue(row, ["Other Fee", "otherFee"])),
          includeExamFeeInInstallments: parseBoolean(
            getRowValue(row, [
              "Include Exam Fee In Installments",
              "includeExamFeeInInstallments",
            ]),
          ),
          includeRegistrationFeeInInstallments: parseBoolean(
            getRowValue(row, [
              "Include Registration Fee In Installments",
              "includeRegistrationFeeInInstallments",
            ]),
          ),
          includePracticalFeeInInstallments: parseBoolean(
            getRowValue(row, [
              "Include Practical Fee In Installments",
              "includePracticalFeeInInstallments",
            ]),
          ),
          includeOtherFeeInInstallments: parseBoolean(
            getRowValue(row, [
              "Include Other Fee In Installments",
              "includeOtherFeeInInstallments",
            ]),
          ),
          teacherId: resolvedTeacherIds,
        };

        coursePayload.totalFee = calculateTotalFee(coursePayload);

        const existingCourse = await CourseSchema.findOne({
          $or: [{ courseId }, { courseName }],
        });

        if (existingCourse) {
          if (existingCourse.teacherId?.length) {
            await TeacherSchema.updateMany(
              { _id: { $in: existingCourse.teacherId } },
              { $pull: { courseId: existingCourse._id } },
            );
          }

          const updatedCourse = await CourseSchema.findByIdAndUpdate(
            existingCourse._id,
            coursePayload,
            { new: true, runValidators: true },
          );

          if (resolvedTeacherIds.length) {
            await TeacherSchema.updateMany(
              { _id: { $in: resolvedTeacherIds } },
              { $addToSet: { courseId: updatedCourse._id } },
            );
          }

          courseMap.set(courseId.toLowerCase(), String(updatedCourse._id));
          courseMap.set(courseName.toLowerCase(), String(updatedCourse._id));
          results.coursesUpdated += 1;
        } else {
          const createdCourse = await CourseSchema.create(coursePayload);
          if (resolvedTeacherIds.length) {
            await TeacherSchema.updateMany(
              { _id: { $in: resolvedTeacherIds } },
              { $addToSet: { courseId: createdCourse._id } },
            );
          }

          courseMap.set(courseId.toLowerCase(), String(createdCourse._id));
          courseMap.set(courseName.toLowerCase(), String(createdCourse._id));
          results.coursesImported += 1;
        }
      } catch (error) {
        results.errors.push(`Courses row ${rowNumber}: ${error.message}`);
      }
    }

    for (let index = 0; index < batchesSheet.length; index += 1) {
      const row = batchesSheet[index];
      const rowNumber = index + 2;

      try {
        const batchCode = normalizeText(getRowValue(row, ["Batch Code", "batchCode"]));
        const batchName = normalizeText(getRowValue(row, ["Batch Name", "batchName"]));
        const courseRef = normalizeText(
          getRowValue(row, ["Course ID", "Course Name", "course"]),
        );
        const shift = normalizeText(getRowValue(row, ["Shift", "shift"]));
        const days = normalizeText(getRowValue(row, ["Days", "days"]));
        const hoursPerDay = Number(
          getRowValue(row, ["Hours Per Day", "hoursPerDay"]) || 0,
        );
        const startDate = normalizeText(
          getRowValue(row, ["Start Date", "startDate"]),
        );

        if (!batchCode || !batchName || !courseRef || !shift || !days || !hoursPerDay || !startDate) {
          throw new Error("Missing required batch fields");
        }

        const resolvedCourseId = courseMap.get(courseRef.toLowerCase());
        if (!resolvedCourseId) {
          throw new Error(`Course reference not found: ${courseRef}`);
        }

        const batchPayload = {
          batchCode,
          batchName,
          course: resolvedCourseId,
          shift,
          days,
          hoursPerDay,
          startDate,
          endDate:
            normalizeText(getRowValue(row, ["End Date", "endDate"])) || null,
          maxStudents: Number(
            getRowValue(row, ["Max Students", "Maximum Students", "maxStudents"]) ||
              30,
          ),
          description:
            normalizeText(getRowValue(row, ["Description", "description"])) || "",
          status:
            normalizeText(getRowValue(row, ["Status", "status"])) || "Active",
          isActive:
            getRowValue(row, ["Is Active", "isActive"]) === null
              ? true
              : parseBoolean(getRowValue(row, ["Is Active", "isActive"])),
        };

        const existingBatch = await BatchSchema.findOne({ batchCode });

        if (existingBatch) {
          await BatchSchema.findByIdAndUpdate(existingBatch._id, batchPayload, {
            new: true,
            runValidators: true,
          });
          results.batchesUpdated += 1;
        } else {
          await BatchSchema.create(batchPayload);
          results.batchesImported += 1;
        }
      } catch (error) {
        results.errors.push(`Batches row ${rowNumber}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: "Course workbook import completed",
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while importing course workbook",
      error: error.message,
    });
  }
};

export default createCourse;
