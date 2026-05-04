import express from "express";
import multer from "multer";
import createTeacher, {
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} from "../controller/teacherController.js";

const teacherRouter = express.Router();

// Set up multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create Teacher
teacherRouter.post(
  "/create-teacher",
  upload.single("profilePicture"),
  createTeacher,
);

// Get all teachers
teacherRouter.get("/", getAllTeachers);

// Get teacher by ID
teacherRouter.get("/:id", getTeacherById);

// Update teacher
teacherRouter.put("/:id", upload.single("profilePicture"), updateTeacher);

// Delete teacher
teacherRouter.delete("/:id", deleteTeacher);

export default teacherRouter;
