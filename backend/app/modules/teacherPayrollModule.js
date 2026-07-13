import mongoose from "mongoose";

const TeacherPayrollSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1900,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    salaryType: {
      type: String,
      enum: ["fixed", "per_student"],
      default: "fixed",
    },
    salaryPerStudent: {
      type: Number,
      default: null,
      min: 0,
    },
    attendanceThreshold: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    totalActiveStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    eligibleStudents: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    overpaidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    paymentEntries: [
      {
        paymentDate: {
          type: Date,
          required: true,
        },
        paymentMethod: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "PaymentMethod",
          required: true,
        },
        paymentMethodName: {
          type: String,
          trim: true,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        transactionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AccountingTransaction",
        },
        details: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],
    studentAdjustments: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        note: {
          type: String,
          trim: true,
          default: "",
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true },
);

TeacherPayrollSchema.index({ teacher: 1, year: 1, month: 1 }, { unique: true });

const TeacherPayroll = mongoose.model("TeacherPayroll", TeacherPayrollSchema);
export default TeacherPayroll;
