// models/AccountingTransaction.js
import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const AccountingTransactionSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },

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
      type: String,
      ref: "AccountingType",
      required: true,
      trim: true,
    },
    head: {
      type: String,
      ref: "HeadOfAccount",
      required: true,
    },
    paymentMethod: {
      type: String,
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
      type: String,
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
