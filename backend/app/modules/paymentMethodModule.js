// models/PaymentMethod.js
import mongoose from "mongoose";

const PaymentMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["cash", "bank", "other"],
      default: "bank",
    },
    bankDetails: {
      accountTitle: { type: String, trim: true, default: "" },
      accountNumber: { type: String, trim: true, default: "" },
      branchCode: { type: String, trim: true, default: "" },
      bankName: { type: String, trim: true, default: "" },
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    isDefault: {
      type: Boolean,
      default: false, // true only for Cash
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const PaymentMethod = mongoose.model("PaymentMethod", PaymentMethodSchema);
export default PaymentMethod;
