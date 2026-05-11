// models/Course.js
import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },

    courseId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    courseName: {
      type: String,
      required: true,
      trim: true,
    },

    // Course Category for system-generated numbers
    courseCategory: {
      type: String,
      enum: ["IT & Vocational", "Coaching"],
      default: "IT & Vocational",
      required: true,
    },

    duration: {
      type: Number, // 2,3,4,5,6 months
      required: true,
      min: 1,
    },

    admissionFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    courseFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    certificateFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    examFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    registrationFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    practicalFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    otherFee: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    includeExamFeeInInstallments: {
      type: Boolean,
      default: false,
    },

    includeRegistrationFeeInInstallments: {
      type: Boolean,
      default: false,
    },

    includePracticalFeeInInstallments: {
      type: Boolean,
      default: false,
    },

    includeOtherFeeInInstallments: {
      type: Boolean,
      default: false,
    },

    totalFee: {
      type: Number,
      required: true,
      min: 0,
    },
    teacherId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
        // required: false,
      },
    ],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Course", CourseSchema);
