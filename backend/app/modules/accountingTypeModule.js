// models/AccountingType.js
import mongoose from "mongoose";

const AccountingTypeSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ["Income", "Expense"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

const AccountingType = mongoose.model("AccountingType", AccountingTypeSchema);
export default AccountingType;
