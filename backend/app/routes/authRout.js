import express from "express";
import { createUser, userLogin } from "../controller/userAuthcontroller.js";
import multer from "multer";
import authMiddleware from "../midlewear/authMiddleware.js";
import requireAuth from "../midlewear/requireAuth.js";
import superAdminOnly from "../midlewear/superAdminOnly.js";

const authRout = express.Router();

// Set up multer for file uploads (if needed in the future)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Sample route for user management
authRout.post(
  "/user-signup",
  authMiddleware,
  requireAuth,
  superAdminOnly,
  upload.single("profile"),
  createUser,
);
authRout.post("/user-login", userLogin);

export default authRout;
