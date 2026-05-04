import express from "express";
import createCourse, {
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} from "../controller/CourseController.js";

const couresRoute = express.Router();

// Create Course
couresRoute.post("/create-course", createCourse);

// Get all courses
couresRoute.get("/", getAllCourses);

// Get course by ID
couresRoute.get("/:id", getCourseById);

// Update course
couresRoute.put("/:id", updateCourse);

// Delete course
couresRoute.delete("/:id", deleteCourse);

export default couresRoute;
