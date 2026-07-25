import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const ExpenseHeadEntrySchema = new mongoose.Schema(
  {
    voucherNo: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      set: normalizeDateOnly,
    },
    payeeName: {
      type: String,
      required: true,
      trim: true,
    },
    paymentPurpose: {
      type: String,
      required: true,
      trim: true,
    },
    expenseCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HeadOfAccount",
      required: true,
    },
    paymentMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    chequeNoOrTransactionId: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountInWords: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountingTransaction",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

ExpenseHeadEntrySchema.index({ voucherNo: 1, date: 1 }, { unique: true });
ExpenseHeadEntrySchema.index({ payeeName: 1 });

const ExpenseHeadEntry = mongoose.model(
  "ExpenseHeadEntry",
  ExpenseHeadEntrySchema,
);

export default ExpenseHeadEntry;
