// models/Enrollment.js
import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const EnrollmentSchema = new mongoose.Schema(
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

    course: {
      type: String,
      ref: "Course",
      required: true,
    },

    batch: {
      type: String,
      ref: "Batch",
    },

    enrollmentDate: {
      type: Date,
      required: true,
      default: Date.now,
      set: normalizeDateOnly,
    },

    status: {
      type: String,
      enum: ["Active", "Completed", "Dropped", "On Hold"],
      default: "Active",
      required: true,
    },

    completionDate: {
      type: Date,
      set: normalizeDateOnly,
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Keep lookup index for performance, but allow multiple enrollments
EnrollmentSchema.index({ student: 1, course: 1 });

export default mongoose.model("Enrollment", EnrollmentSchema);
