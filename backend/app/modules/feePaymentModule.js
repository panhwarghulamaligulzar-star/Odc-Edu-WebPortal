// models/FeePayment.js
import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const FeePaymentSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },

    receiptNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    voucherNo: {
      type: String,
      trim: true,
    },

    student: {
      type: String,
      ref: "Admission",
      required: true,
    },

    course: {
      type: String,
      ref: "Course",
      required: true,
    },

    feeStructure: {
      type: String,
      ref: "FeeStructure",
      required: true,
    },

    installmentNumber: {
      type: Number,
      min: 1,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
      set: normalizeDateOnly,
    },

    paymentMethod: {
      type: String,
      default: "Cash",
      required: true,
    },

    // Reference to the accounting PaymentMethod (bank/cash account) used
    // for automatic balance tracking in the accounting module.
    accountingPaymentMethodId: {
      type: String,
      ref: "PaymentMethod",
      default: null,
    },

    transactionId: {
      type: String,
      trim: true,
    },

    chequeNo: {
      type: String,
      trim: true,
    },

    bankName: {
      type: String,
      trim: true,
    },

    remarks: {
      type: String,
      trim: true,
    },

    receivedBy: {
      type: String,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["Completed", "Pending", "Failed", "Refunded"],
      default: "Completed",
      required: true,
    },

    paymentType: {
      type: String,
      enum: ["Full", "Partial", "Installment"],
      default: "Installment",
    },

    refundDetails: {
      refundAmount: {
        type: Number,
        min: 0,
        default: 0,
      },
      refundDate: {
        type: Date,
        set: normalizeDateOnly,
      },
      refundReason: {
        type: String,
        trim: true,
      },
      refundedBy: {
        type: String,
        ref: "User",
      },
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("FeePayment", FeePaymentSchema);
