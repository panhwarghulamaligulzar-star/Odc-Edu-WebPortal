import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
import requireAuth from "../midlewear/requireAuth.js";
import superAdminOnly from "../midlewear/superAdminOnly.js";
import {
  createBackup,
  createDownloadTicket,
  confirmDownload,
  deleteBackup,
  downloadBackup,
  downloadBackupByTicket,
  getHistory,
  getOverview,
  uploadBackupToDrive,
  verifyBackup,
} from "../controller/databaseBackupController.js";

const router = express.Router();
router.get(
  "/:environment/:id/download-file/:ticket",
  downloadBackupByTicket,
);
router.use(authMiddleware, requireAuth, superAdminOnly);

router.get("/overview/:environment", getOverview);
router.get("/history/:environment", getHistory);
router.post("/:environment", createBackup);
router.post("/:environment/:id/download-ticket", createDownloadTicket);
router.get("/:environment/:id/download", downloadBackup);
router.post("/:environment/:id/download-complete", confirmDownload);
router.post("/:environment/:id/verify", verifyBackup);
router.post("/:environment/:id/google-drive", uploadBackupToDrive);
router.delete("/:environment/:id", deleteBackup);

export default router;
