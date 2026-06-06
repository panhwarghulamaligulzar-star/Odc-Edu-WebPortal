import express from "express";
import multer from "multer";
import createCourse, {
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  bulkImportCoursesWorkbook,
} from "../controller/CourseController.js";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";

const couresRoute = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Create Course
couresRoute.post("/create-course", authMiddleware, authorize("courses", "create"), createCourse);

// Get all courses
couresRoute.get("/", authMiddleware, authorize("courses", "view"), getAllCourses);

// Bulk import courses + batches workbook
couresRoute.post(
  "/bulk-import",
  authMiddleware,
  authorize("courses", "import"),
  upload.single("file"),
  bulkImportCoursesWorkbook,
);

// Get course by ID
couresRoute.get("/:id", authMiddleware, authorize("courses", "view"), getCourseById);

// Update course
couresRoute.put("/:id", authMiddleware, authorize("courses", "update"), updateCourse);

// Delete course
couresRoute.delete("/:id", authMiddleware, authorize("courses", "delete"), deleteCourse);

export default couresRoute;
