import express from "express";
import {
  getUserAccount,
  updateUserAccount,
  deleteUserAccount,
  completeUserProfile,
  getAllProfileData,
} from "../controller/userAccountcontroller.js";
import authMiddleware from "../midlewear/authMiddleware.js";
import multer from "multer";

const accountRoute = express.Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

accountRoute.get("/account-info/:id", authMiddleware, getUserAccount);
accountRoute.put(
  "/account-update/:id",
  authMiddleware,
  upload.single("profile"),
  updateUserAccount,
);
accountRoute.delete("/account-delete/:id", authMiddleware, deleteUserAccount);
accountRoute.put("/complete-profile/:id", completeUserProfile);
accountRoute.get("/getAllProfilesInfo", getAllProfileData);

export { accountRoute };
