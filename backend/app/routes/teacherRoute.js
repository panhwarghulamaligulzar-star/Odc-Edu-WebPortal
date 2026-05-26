import express from "express";
import multer from "multer";
import createTeacher, {
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} from "../controller/teacherController.js";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";

const teacherRouter = express.Router();

// Set up multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create Teacher
teacherRouter.post(
  "/create-teacher",
  authMiddleware,
  authorize("employees", "create"),
  upload.single("profilePicture"),
  createTeacher,
);

// Get all teachers
teacherRouter.get("/", authMiddleware, authorize("employees", "view"), getAllTeachers);

// Get teacher by ID
teacherRouter.get("/:id", authMiddleware, authorize("employees", "view"), getTeacherById);

// Update teacher
teacherRouter.put("/:id", authMiddleware, authorize("employees", "update"), upload.single("profilePicture"), updateTeacher);

// Delete teacher
teacherRouter.delete("/:id", authMiddleware, authorize("employees", "delete"), deleteTeacher);

export default teacherRouter;
