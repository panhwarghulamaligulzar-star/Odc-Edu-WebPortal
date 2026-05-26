import express from "express";
import multer from "multer";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";
import {
  createNewAnnouncementRoute,
  getAllAnnouncementsRoute,
  getAnnouncementByIdRoute,
  updateAnnouncementRoute,
  deleteAnnouncementRoute,
  toggleAnnouncementStatusRoute
} from "../controller/announcementController.js";

const announcementRoute = express.Router();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
announcementRoute.post("/create-announcement", authMiddleware, authorize("announcements", "create"), upload.single("bannerImage"), createNewAnnouncementRoute);
announcementRoute.get("/get-all-announcements", authMiddleware, authorize("announcements", "view"), getAllAnnouncementsRoute);
announcementRoute.get("/get-announcement/:id", authMiddleware, authorize("announcements", "view"), getAnnouncementByIdRoute);
announcementRoute.put("/update-announcement/:id", authMiddleware, authorize("announcements", "update"), upload.single("bannerImage"), updateAnnouncementRoute);
announcementRoute.delete("/delete-announcement/:id", authMiddleware, authorize("announcements", "delete"), deleteAnnouncementRoute);
announcementRoute.patch("/toggle-announcement-status/:id", authMiddleware, authorize("announcements", "approve"), toggleAnnouncementStatusRoute);

export default announcementRoute;
