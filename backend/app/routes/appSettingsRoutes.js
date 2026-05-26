import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import authMiddleware from "../midlewear/authMiddleware.js";
import requireAuth from "../midlewear/requireAuth.js";
import superAdminOnly from "../midlewear/superAdminOnly.js";
import {
  getAppSettings,
  updateAppSettings,
  uploadFavicon,
  uploadLogo,
  uploadPdfLogo,
} from "../controller/appSettingsController.js";

const router = express.Router();

const uploadsRoot = process.env.UPLOADS_DIR || "./uploads";
const brandingDir = path.join(process.cwd(), uploadsRoot, "branding");
fs.mkdirSync(brandingDir, { recursive: true });

const allowedExtensions = new Set(
  (process.env.ALLOWED_IMAGE_EXTENSIONS || ".jpg,.jpeg,.png,.svg,.ico,.webp,.gif")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean),
);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, brandingDir),
  filename: (_req, file, cb) => {
    const sanitized = file.originalname.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9._-]/g, "");
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE || 15 * 1024 * 1024),
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mimeType = (file.mimetype || "").toLowerCase();
    const isImageMime = mimeType.startsWith("image/");

    if (isImageMime || allowedExtensions.has(extension) || mimeType === "application/octet-stream") {
      cb(null, true);
      return;
    }
    cb(new Error("Unsupported file type"));
  },
});

router.get("/", getAppSettings);
router.put("/", authMiddleware, requireAuth, superAdminOnly, updateAppSettings);
router.post("/logo", authMiddleware, requireAuth, superAdminOnly, upload.single("file"), uploadLogo);
router.post("/favicon", authMiddleware, requireAuth, superAdminOnly, upload.single("file"), uploadFavicon);
router.post("/pdf-logo", authMiddleware, requireAuth, superAdminOnly, upload.single("file"), uploadPdfLogo);

router.use((error, _req, res, next) => {
  if (!error) {
    next();
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Image is too large. Please upload a file smaller than 15 MB."
        : error.message;

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (error.message === "Unsupported file type") {
    return res.status(400).json({
      success: false,
      message:
        "Unsupported file type. Please upload PNG, JPG, JPEG, SVG, ICO, or WEBP images.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Branding upload failed",
    error: error.message,
  });
});

export default router;
