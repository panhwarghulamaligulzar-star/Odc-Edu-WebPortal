import CourseSchema from "../modules/courseModule.js";
import TeacherSchema from "../modules/teacherModule.js";
import mongoose from "mongoose";

const toNum = (value) => Math.max(0, Number(value) || 0);

const calculateTotalFee = (data = {}) =>
  toNum(data.admissionFee) +
  toNum(data.courseFee) +
  toNum(data.certificateFee) +
  toNum(data.examFee) +
  toNum(data.registrationFee) +
  toNum(data.practicalFee) +
  toNum(data.otherFee);

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

    res.status(200).json({
      success: true,
      message: "Courses retrieved successfully",
      data: courses,
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

    res.status(200).json({
      success: true,
      message: "Course retrieved successfully",
      data: course,
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

export default createCourse;
