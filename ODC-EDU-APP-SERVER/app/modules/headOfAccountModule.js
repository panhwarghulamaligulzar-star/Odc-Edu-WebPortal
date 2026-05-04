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
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountingType",
      required: true,
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
