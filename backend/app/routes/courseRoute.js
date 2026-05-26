import express from "express";
import createCourse, {
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../controller/CourseController.js";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";

const couresRoute = express.Router();

// Create Course
couresRoute.post("/create-course", authMiddleware, authorize("courses", "create"), createCourse);

// Get all courses
couresRoute.get("/", authMiddleware, authorize("courses", "view"), getAllCourses);

// Get course by ID
couresRoute.get("/:id", authMiddleware, authorize("courses", "view"), getCourseById);

// Update course
couresRoute.put("/:id", authMiddleware, authorize("courses", "update"), updateCourse);

// Delete course
couresRoute.delete("/:id", authMiddleware, authorize("courses", "delete"), deleteCourse);

export default couresRoute;
