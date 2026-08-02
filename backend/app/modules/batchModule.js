// models/Batch.js
import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const BatchSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },

    batchName: {
      type: String,
      required: true,
      trim: true,
    },

    batchCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    course: {
      type: String,
      ref: "Course",
      required: true,
    },

    shift: {
      type: String,
      enum: ["Morning", "Evening"],
      required: true,
    },

    days: {
      type: String,
      enum: ["Monday to Saturday", "Monday to Thursday", "Saturday & Sunday"],
      required: true,
    },

    hoursPerDay: {
      type: Number,
      required: true,
      min: 1,
      max: 24,
    },

    startDate: {
      type: Date,
      required: true,
      set: normalizeDateOnly,
    },

    endDate: {
      type: Date,
      set: normalizeDateOnly,
    },

    maxStudents: {
      type: Number,
      default: 30,
      min: 1,
    },

    currentStudents: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Completed", "Upcoming", "Cancelled"],
      default: "Active",
    },

    description: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to prevent duplicate batch codes per course
BatchSchema.index({ course: 1, batchCode: 1 }, { unique: true });

export default mongoose.model("Batch", BatchSchema);
