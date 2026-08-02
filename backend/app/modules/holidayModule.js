import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const HolidaySchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },

    date: {
      type: Date,
      required: true,
      set: normalizeDateOnly,
    },

    // Optional end date for multi-day holidays (same as date for single-day)
    endDate: {
      type: Date,
      default: null,
      set: normalizeDateOnly,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["government", "academy"],
      required: true,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    // For government holidays that repeat every year on same date (e.g., Aug 14)
    isRecurring: {
      type: Boolean,
      default: false,
    },

    // Which batches are affected — empty array means ALL batches
    affectedBatches: [
      {
        type: String,
        ref: "Batch",
      },
    ],

    // Who created/modified this holiday
    createdBy: {
      type: String,
      ref: "User",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fast date-range lookups
HolidaySchema.index({ date: 1, type: 1 });
HolidaySchema.index({ date: 1, isActive: 1 });

export default mongoose.model("Holiday", HolidaySchema);
