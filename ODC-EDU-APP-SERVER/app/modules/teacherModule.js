// models/Teacher.js
import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const TeacherSchema = new mongoose.Schema(
  {
    teacherId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      required: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
      set: normalizeDateOnly,
    },

    contactNo: {
      type: String,
      required: true,
      trim: true,
    },

    contractPeriod: {
      type: String,
      // example: "6 Months", "1 Year"
      required: true,
      trim: true,
    },

    cnicNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    profilePicture: {
      type: String, // Base64 encoded image or URL
      default: null,
    },

    courseId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],

    // ====== NEW FIELDS ======

    designation: {
      type: String,
      trim: true,
      default: null,
      // example: "Director", "Principal", "Manager", "Accountant", etc.
    },

    highestQualification: {
      type: String,
      trim: true,
      default: null,
      // example: "Intermediate", "Bachelor", "Master", "PhD", "Diploma"
    },

    degreeTitle: {
      type: String,
      trim: true,
      default: null,
      // example: "BSc", "BS", "MA", "MSc"
    },

    majorSubject: {
      type: String,
      trim: true,
      default: null,
      // example: "Computer Science", "Mathematics", "Physics", etc.
    },

    teachingExperience: {
      type: String,
      trim: true,
      default: null,
      // example: "Fresh", "1", "2", "3", "10+"
    },

    computerSkills: {
      type: [String], // Array of strings
      default: [],
      // example: ["MS Office", "Web Development", "Graphic Design"]
    },

    monthlySalary: {
      type: String,
      default: null,
      // Can store: "50000", "50000 PKR", "50%"
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Teacher", TeacherSchema);
