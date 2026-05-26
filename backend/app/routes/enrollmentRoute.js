// routes/enrollmentRoute.js
import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";
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
router.post("/", authMiddleware, authorize("students", "create"), createEnrollment);

// Get all enrollments with filters
router.get("/", authMiddleware, authorize("students", "view"), getAllEnrollments);

// Get all enrollments for a student
router.get("/student/:studentId", authMiddleware, authorize("students", "view"), getStudentEnrollments);

// Get all students enrolled in a course
router.get("/course/:courseId", authMiddleware, authorize("students", "view"), getCourseEnrollments);

// Update enrollment status
router.put("/:enrollmentId", authMiddleware, authorize("students", "update"), updateEnrollmentStatus);

// Delete enrollment and associated fee structure
router.delete("/:enrollmentId", authMiddleware, authorize("students", "delete"), deleteEnrollment);

export default router;
