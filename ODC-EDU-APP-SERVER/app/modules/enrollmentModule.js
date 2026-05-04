// models/Enrollment.js
import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
      required: true,
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },

    enrollmentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["Active", "Completed", "Dropped", "On Hold"],
      default: "Active",
      required: true,
    },

    completionDate: {
      type: Date,
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
