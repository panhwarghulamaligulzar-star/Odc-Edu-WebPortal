// models/FeeStructure.js
import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const FeeStructureSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admission",
      required: true,
    },

    course: {
      type: String,
      ref: "Course",
      required: true,
    },

    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
    },

    // Fee Components
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

    additionalFees: [
      {
        feeType: {
          type: String,
          enum: ["exam", "registration", "practical", "other"],
          default: "other",
        },
        title: {
          type: String,
          trim: true,
          required: true,
        },
        amount: {
          type: Number,
          min: 0,
          default: 0,
        },
        paymentMode: {
          type: String,
          enum: ["one_time", "two_installments"],
          default: "one_time",
        },
        numberOfInstallments: {
          type: Number,
          min: 1,
          max: 2,
          default: 1,
        },
      },
    ],

    // Discount Configuration
    discount: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    paymentPlanType: {
      type: String,
      enum: ["monthly", "three_installments", "full_payment", "custom"],
      default: "custom",
    },

    discountOnAdmission: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountOnCourseFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    discountType: {
      type: String,
      enum: ["none", "admission", "courseFee", "both"],
      default: "none",
    },

    totalFee: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    remainingAmount: {
      type: Number,
      required: true,
      min: -999999, // Allow negative for edge cases
    },

    // Installment Configuration
    installmentEnabled: {
      type: Boolean,
      default: false,
    },

    numberOfInstallments: {
      type: Number,
      min: 1,
      default: 1,
    },

    installmentAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    installments: [
      {
        installmentNumber: {
          type: Number,
          required: true,
        },
        description: {
          type: String,
          trim: true,
        },
        feeComponents: {
          admissionFee: {
            type: Number,
            default: 0,
            min: 0,
          },
          courseFee: {
            type: Number,
            default: 0,
            min: 0,
          },
          certificateFee: {
            type: Number,
            default: 0,
            min: 0,
          },
          examFee: {
            type: Number,
            default: 0,
            min: 0,
          },
          registrationFee: {
            type: Number,
            default: 0,
            min: 0,
          },
          practicalFee: {
            type: Number,
            default: 0,
            min: 0,
          },
          otherFee: {
            type: Number,
            default: 0,
            min: 0,
          },
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        dueDate: {
          type: Date,
          required: true,
          set: normalizeDateOnly,
        },
        status: {
          type: String,
          enum: ["Pending", "Paid", "Overdue", "Partial"],
          default: "Pending",
        },
        paidAmount: {
          type: Number,
          default: 0,
          min: 0,
        },
        paidDate: {
          type: Date,
          set: normalizeDateOnly,
        },
        receiptNumber: {
          type: String,
          trim: true,
        },
        voucherNo: {
          type: String,
          trim: true,
        },
      },
    ],

    feeStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid", "Overdue"],
      default: "Unpaid",
      required: true,
    },

    // System-generated number for IT & Vocational courses
    systemGrantedNumber: {
      type: String,
      trim: true,
      default: null,
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

// Keep lookup index for speed, but allow repeated course enrollments per student.
FeeStructureSchema.index({ student: 1, course: 1 });

export default mongoose.model("FeeStructure", FeeStructureSchema);
