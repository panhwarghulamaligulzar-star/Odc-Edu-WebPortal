import courseModule from "../modules/courseModule.js";
import TeacherSchema from "../modules/teacherModule.js";
import * as XLSX from "xlsx";

const getRowValue = (row, keys = []) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") {
      return row[key];
    }
  }
  return null;
};

const normalizeString = (value) => String(value || "").trim();

const isRowBlank = (row = {}) =>
  !Object.values(row).some((value) => normalizeString(value));

const parseSkills = (value) =>
  normalizeString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseCourseRefs = (value) =>
  normalizeString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const createTeacher = async (req, res) => {
  try {
    console.log("=== CREATE TEACHER REQUEST ===");
    // console.log("Request Body:", req.body);

    let {
      teacherId,
      fullName,
      fatherName,
      gender,
      appointmentDate,
      contactNo,
      contractPeriod,
      cnicNo,
      address,
      courseId,
      designation,
      highestQualification,
      degreeTitle,
      majorSubject,
      teachingExperience,
      computerSkills,
      monthlySalary,
    } = req.body;

    // Parse courseId if it's a JSON string (from FormData)
    if (courseId && typeof courseId === "string") {
      try {
        courseId = JSON.parse(courseId);
      } catch (e) {
        courseId = [courseId];
      }
    }

    // ✅ Parse computerSkills
    computerSkills = computerSkills || [];
    if (typeof computerSkills === "string") {
      // Try JSON parse first, fall back to comma split
      try {
        computerSkills = JSON.parse(computerSkills);
      } catch (e) {
        computerSkills = computerSkills.split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    // Ensure it's an array
    if (!Array.isArray(computerSkills)) {
      computerSkills = [];
    }

    console.log("Parsed computerSkills:", computerSkills);

    // Handle profile picture if uploaded
    let profilePicture = null;
    if (req.file) {
      profilePicture = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    // Validate required fields
    if (
      !teacherId ||
      !fullName ||
      !fatherName ||
      !gender ||
      !appointmentDate ||
      !contactNo ||
      !contractPeriod ||
      !cnicNo ||
      !address
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    const teacherData = {
      teacherId,
      fullName,
      fatherName,
      gender,
      appointmentDate,
      contactNo,
      contractPeriod,
      cnicNo,
      address,
      profilePicture,
      courseId,
      designation: designation || null,
      highestQualification: highestQualification || null,
      degreeTitle: degreeTitle || null,
      majorSubject: majorSubject || null,
      teachingExperience: teachingExperience || null,
      computerSkills: computerSkills,
      monthlySalary: monthlySalary || null,
    };

    console.log("Teacher Data to save:", teacherData);

    // Create teacher
    const teacher = await TeacherSchema.create(teacherData);
    
    // Assign teacher to courses
    if (courseId && courseId.length > 0) {
      await courseModule.updateMany(
        { _id: { $in: courseId } },
        { $addToSet: { teacherId: teacher._id } }
      );
    }

    res.status(201).json({
      success: true,
      message: "Teacher created and courses assigned successfully",
      data: teacher,
    });
  } catch (error) {
    console.error("Create Teacher Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all teachers
export const getAllTeachers = async (req, res) => {
  try {
    const teachers = await TeacherSchema.find()
      .populate("courseId", "courseName courseId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Teachers retrieved successfully",
      data: teachers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get teacher by ID
export const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await TeacherSchema.findById(id).populate(
      "courseId",
      "courseName courseId"
    );

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Teacher retrieved successfully",
      data: teacher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update teacher
export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Parse courseId if it's a JSON string (from FormData)
    if (updateData.courseId && typeof updateData.courseId === "string") {
      try {
        updateData.courseId = JSON.parse(updateData.courseId);
      } catch (e) {
        updateData.courseId = [updateData.courseId];
      }
    }

    // ✅ Parse computerSkills
    updateData.computerSkills = updateData.computerSkills || [];
    if (typeof updateData.computerSkills === "string") {
      // Try JSON parse first, fall back to comma split
      try {
        updateData.computerSkills = JSON.parse(updateData.computerSkills);
      } catch (e) {
        updateData.computerSkills = updateData.computerSkills.split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    // Ensure it's an array
    if (!Array.isArray(updateData.computerSkills)) {
      updateData.computerSkills = [];
    }

    console.log("Parsed computerSkills for update:", updateData.computerSkills);

    // monthlySalary is already a string, no conversion needed

    // Handle profile picture if uploaded
    if (req.file) {
      updateData.profilePicture = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const teacher = await TeacherSchema.findById(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }
    // If courseId is being updated, handle course-teacher relationships
    if (updateData.courseId) {
      // Remove teacher from old courses
      if (teacher.courseId && Array.isArray(teacher.courseId) && teacher.courseId.length > 0) {
        await courseModule.updateMany(
          { _id: { $in: teacher.courseId } },
          { $pull: { teacherId: teacher._id } }
        );
      }

      // Add teacher to new courses
      if (Array.isArray(updateData.courseId) && updateData.courseId.length > 0) {
        await courseModule.updateMany(
          { _id: { $in: updateData.courseId } },
          { $addToSet: { teacherId: teacher._id } }
        );
      }
    }

    const updatedTeacher = await TeacherSchema.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate("courseId", "courseName courseId");

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: updatedTeacher,
    });
  } catch (error) {
    console.error("Update teacher error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete teacher
export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("=== DELETE TEACHER REQUEST ===");
    console.log("Teacher ID:", id);

    const teacher = await TeacherSchema.findById(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    // Remove teacher from all courses
    if (teacher.courseId && teacher.courseId.length > 0) {
      console.log("Removing teacher from courses:", teacher.courseId);
      await courseModule.updateMany(
        { _id: { $in: teacher.courseId } },
        { $pull: { teacherId: teacher._id } }
      );
    }

    await TeacherSchema.findByIdAndDelete(id);

    console.log("Teacher deleted successfully");

    res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (error) {
    console.error("Delete teacher error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const bulkImportTeachers = async (req, res) => {
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
    const firstSheetName = workbook.SheetNames[0];
    const rows = firstSheetName
      ? XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
          defval: "",
          raw: false,
        })
      : [];

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "No employee data found in the file",
      });
    }

    const courses = await courseModule.find({}, "courseName courseId").lean();
    const courseLookup = new Map();
    courses.forEach((course) => {
      courseLookup.set(normalizeString(course._id), String(course._id));
      courseLookup.set(normalizeString(course.courseId).toLowerCase(), String(course._id));
      courseLookup.set(normalizeString(course.courseName).toLowerCase(), String(course._id));
    });

    const results = {
      imported: 0,
      updated: 0,
      errors: [],
    };

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        if (isRowBlank(row)) {
          continue;
        }

        const teacherId = normalizeString(
          getRowValue(row, ["Employee ID", "Teacher ID", "teacherId", "ID"]),
        );
        const fullName = normalizeString(
          getRowValue(row, ["Full Name", "Employee Name", "fullName"]),
        );
        const fatherName = normalizeString(
          getRowValue(row, ["Father Name", "fatherName"]),
        );
        const gender = normalizeString(getRowValue(row, ["Gender", "gender"]));
        const appointmentDate = normalizeString(
          getRowValue(row, ["Appointment Date", "Date of Joining", "appointmentDate"]),
        );
        const contactNo = normalizeString(
          getRowValue(row, ["Contact Number", "Contact No", "Phone", "contactNo"]),
        );
        const contractPeriod = normalizeString(
          getRowValue(row, ["Contract Period", "contractPeriod"]),
        );
        const cnicNo = normalizeString(
          getRowValue(row, ["CNIC Number", "CNIC No", "CNIC", "cnicNo"]),
        );
        const address = normalizeString(getRowValue(row, ["Address", "address"]));

        if (
          !teacherId ||
          !fullName ||
          !fatherName ||
          !gender ||
          !appointmentDate ||
          !contactNo ||
          !contractPeriod ||
          !cnicNo ||
          !address
        ) {
          throw new Error("Missing one or more required employee fields");
        }

        const designation = normalizeString(
          getRowValue(row, ["Designation", "designation"]),
        );
        const highestQualification = normalizeString(
          getRowValue(row, ["Highest Qualification", "highestQualification"]),
        );
        const degreeTitle = normalizeString(
          getRowValue(row, ["Degree Title", "degreeTitle"]),
        );
        const majorSubject = normalizeString(
          getRowValue(row, ["Major Subject", "Subject", "majorSubject"]),
        );
        const teachingExperience = normalizeString(
          getRowValue(row, ["Experience", "Teaching Experience", "teachingExperience"]),
        );
        const monthlySalary = normalizeString(
          getRowValue(row, ["Monthly Salary", "monthlySalary"]),
        );
        const computerSkills = parseSkills(
          getRowValue(row, ["Other Skills", "Computer Skills", "computerSkills"]),
        );
        const courseRefs = parseCourseRefs(
          getRowValue(row, ["Assigned Courses", "Course IDs", "courseId"]),
        );

        const resolvedCourseIds = courseRefs
          .map((ref) => courseLookup.get(ref.toLowerCase()) || courseLookup.get(ref))
          .filter(Boolean);

        const teacherData = {
          teacherId,
          fullName,
          fatherName,
          gender,
          appointmentDate,
          contactNo,
          contractPeriod,
          cnicNo,
          address,
          designation: designation || null,
          highestQualification: highestQualification || null,
          degreeTitle: degreeTitle || null,
          majorSubject: majorSubject || null,
          teachingExperience: teachingExperience || null,
          computerSkills,
          monthlySalary: monthlySalary || null,
          courseId: resolvedCourseIds,
        };

        const existingTeacher = await TeacherSchema.findOne({
          $or: [{ teacherId }, { cnicNo }],
        });

        if (existingTeacher) {
          if (existingTeacher.courseId?.length) {
            await courseModule.updateMany(
              { _id: { $in: existingTeacher.courseId } },
              { $pull: { teacherId: existingTeacher._id } },
            );
          }

          await TeacherSchema.findByIdAndUpdate(existingTeacher._id, teacherData, {
            new: true,
            runValidators: true,
          });

          if (resolvedCourseIds.length) {
            await courseModule.updateMany(
              { _id: { $in: resolvedCourseIds } },
              { $addToSet: { teacherId: existingTeacher._id } },
            );
          }

          results.updated += 1;
        } else {
          const teacher = await TeacherSchema.create(teacherData);
          if (resolvedCourseIds.length) {
            await courseModule.updateMany(
              { _id: { $in: resolvedCourseIds } },
              { $addToSet: { teacherId: teacher._id } },
            );
          }
          results.imported += 1;
        }
      } catch (error) {
        results.errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    res.status(200).json({
      success: true,
      message: "Employee import completed",
      data: results,
    });
  } catch (error) {
    console.error("Bulk employee import error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while importing employees",
      error: error.message,
    });
  }
};

export default createTeacher;
