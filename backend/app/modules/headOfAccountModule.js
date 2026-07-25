// models/HeadOfAccount.js
import mongoose from "mongoose";

const HeadOfAccountSchema = new mongoose.Schema(
  {
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
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const HeadOfAccount = mongoose.model("HeadOfAccount", HeadOfAccountSchema);
export default HeadOfAccount;
