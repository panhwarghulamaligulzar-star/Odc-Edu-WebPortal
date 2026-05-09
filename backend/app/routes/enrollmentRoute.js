// routes/enrollmentRoute.js
import express from "express";
import {
  createEnrollment,
  getStudentEnrollments,
  getCourseEnrollments,
  updateEnrollmentStatus,
  getAllEnrollments,
  deleteEnrollment,
} from "../controller/enrollmentController.js";

const router = express.Router();

// Create new enrollment
router.post("/", createEnrollment);

// Get all enrollments with filters
router.get("/", getAllEnrollments);

// Get all enrollments for a student
router.get("/student/:studentId", getStudentEnrollments);

// Get all students enrolled in a course
router.get("/course/:courseId", getCourseEnrollments);

// Update enrollment status
router.put("/:enrollmentId", updateEnrollmentStatus);

// Delete enrollment and associated fee structure
router.delete("/:enrollmentId", deleteEnrollment);

export default router;
