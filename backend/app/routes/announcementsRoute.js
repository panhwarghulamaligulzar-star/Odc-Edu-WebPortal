import express from "express";
import multer from "multer";
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
announcementRoute.post("/create-announcement", upload.single("bannerImage"), createNewAnnouncementRoute);
announcementRoute.get("/get-all-announcements", getAllAnnouncementsRoute);
announcementRoute.get("/get-announcement/:id", getAnnouncementByIdRoute);
announcementRoute.put("/update-announcement/:id", upload.single("bannerImage"), updateAnnouncementRoute);
announcementRoute.delete("/delete-announcement/:id", deleteAnnouncementRoute);
announcementRoute.patch("/toggle-announcement-status/:id", toggleAnnouncementStatusRoute);

export default announcementRoute;
