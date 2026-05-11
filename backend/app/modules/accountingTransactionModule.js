// models/AccountingTransaction.js
import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const AccountingTransactionSchema = new mongoose.Schema(
  {
    transactionNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountingType",
      required: true,
    },
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HeadOfAccount",
      required: true,
    },
    paymentMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
      set: normalizeDateOnly,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    billReference: {
      type: String,
      trim: true,
      default: "",
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const AccountingTransaction = mongoose.model(
  "AccountingTransaction",
  AccountingTransactionSchema,
);
export default AccountingTransaction;
