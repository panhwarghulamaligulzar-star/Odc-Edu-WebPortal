import mongoose from 'mongoose';
import { normalizeDateOnly } from "../utils/dateOnly.js";

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
      set: normalizeDateOnly,
    },

    bannerImage: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Announcement", AnnouncementSchema);
