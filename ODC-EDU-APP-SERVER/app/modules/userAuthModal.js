import mongoose from "mongoose";

const authSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    role:{
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    profile: {
      type: String,
      default:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIf4R5qPKHPNMyAqV-FjS_OTBB8pfUV29Phg&s",
    },
    details: {
      coverPhoto: { type: String },
      education: { type: String },
      city: { type: String },
      age: { type: Number },
      gender: { type: String },
      job: { type: String },
      status: { type: String },
      phone: { type: String },
      address: { type: String },
      socialLinks: {
        facebook: { type: String },
        twitter: { type: String },
        linkedin: { type: String },
        instagram: { type: String },
      },
    },
  },
  { timestamps: true }
);

const UserAuth = mongoose.model("User", authSchema);
export default UserAuth;
