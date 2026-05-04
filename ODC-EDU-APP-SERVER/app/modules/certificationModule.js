// models/Certificate.js
import mongoose from "mongoose";

const CertificateSchema = new mongoose.Schema(
  {
    registrationNo: {
      type: String,
      required: true,
      unique: false 
    },
     courseId: {
      type: String,
      trim: true,
      unique: false ,
    },
     certificateNo: {
      type: String,
      trim: true,
      unique:true
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },

    fatherName: {
      type: String,
      required: true,
      trim: true,
    },

    course: {
      type: String,
      required: true,
      trim: true,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    startingDate: {
      type: Date,
      required: true,
    },

    endingDate: {
      type: Date,
      required: true,
    },

    issueDate: {
      type: Date,
      default: Date.now,
    },

    grade: {
      type: String,
      trim: true,
    },
    skills: {
      type: String,
      
    },
  },
  {
    timestamps: true,
  }
);

// CertificateSchema.index({ certificateNo: 1 }, { unique: true });
export default mongoose.model("StudentCertificate", CertificateSchema);