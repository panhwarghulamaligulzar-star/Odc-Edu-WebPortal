import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const AttendanceSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },

    batch: {
      type: String,
      ref: "Batch",
      required: true,
    },

    date: {
      type: Date,
      required: true,
      set: normalizeDateOnly,
    },

    // polymorphic ref: person can be a student (Admission) or teacher (Teacher)
    person: {
      type: String,
      required: true,
      refPath: "personModel",
    },

    personModel: {
      type: String,
      enum: ["Admission", "Teacher"],
      required: true,
    },

    personType: {
      type: String,
      enum: ["student", "teacher"],
      required: true,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "Leave", "Holiday"],
      default: "Absent",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    markedBy: {
      type: String,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Unique: one attendance record per person per batch per date
AttendanceSchema.index({ batch: 1, date: 1, person: 1 }, { unique: true });
// Index for fast queries
AttendanceSchema.index({ batch: 1, date: 1 });
AttendanceSchema.index({ person: 1, personType: 1 });

export default mongoose.model("Attendance", AttendanceSchema);
