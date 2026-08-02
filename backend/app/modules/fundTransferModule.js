// modules/fundTransferModule.js
import mongoose from "mongoose";
import { normalizeDateOnly } from "../utils/dateOnly.js";

const fundTransferSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },

    transferNo: {
      type: String,
      unique: true,
      trim: true,
    },
    fromMethod: {
      type: String,
      ref: "PaymentMethod",
      required: [true, "Source account is required"],
    },
    toMethod: {
      type: String,
      ref: "PaymentMethod",
      required: [true, "Destination account is required"],
    },
    amount: {
      type: Number,
      required: [true, "Transfer amount is required"],
      min: [1, "Amount must be greater than 0"],
    },
    transferDate: {
      type: Date,
      required: [true, "Transfer date is required"],
      default: Date.now,
      set: normalizeDateOnly,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    createdBy: {
      type: String,
      ref: "User",
    },
  },
  { timestamps: true },
);

const FundTransfer = mongoose.model("FundTransfer", fundTransferSchema);
export default FundTransfer;
