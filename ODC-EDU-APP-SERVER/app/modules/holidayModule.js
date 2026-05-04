import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },

    // Optional end date for multi-day holidays (same as date for single-day)
    endDate: {
      type: Date,
      default: null,
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
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
      },
    ],

    // Who created/modified this holiday
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserAuth",
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
