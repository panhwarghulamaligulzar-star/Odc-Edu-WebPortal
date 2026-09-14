import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const StudentTeacherAssignmentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    student: {
      type: String,
      ref: "Admission",
      required: true,
    },
    enrollment: {
      type: String,
      ref: "Enrollment",
      required: true,
    },
    sourceCourse: {
      type: String,
      ref: "Course",
      required: true,
    },
    assignedCourse: {
      type: String,
      ref: "Course",
      required: true,
    },
    batch: {
      type: String,
      ref: "Batch",
    },
    fromTeacher: {
      type: String,
      ref: "Teacher",
    },
    teacher: {
      type: String,
      ref: "Teacher",
      required: true,
    },
    transferDate: {
      type: Date,
      required: true,
      set: normalizeDateOnly,
    },
    reason: {
      type: String,
      trim: true,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      ref: "User",
    },
  },
  { timestamps: true },
);

StudentTeacherAssignmentSchema.index({ enrollment: 1, isActive: 1 });
StudentTeacherAssignmentSchema.index({ teacher: 1, assignedCourse: 1 });

export default mongoose.model(
  "StudentTeacherAssignment",
  StudentTeacherAssignmentSchema,
);
