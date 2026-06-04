import fs from "fs";
import path from "path";
import AppSettings from "../modules/appSettingsModule.js";

const ensureSettings = async () => {
  let settings = await AppSettings.findOne();
  if (!settings) {
    settings = await AppSettings.create({});
  }
  return settings;
};

const buildAssetUrl = (req, relativePath = "") => {
  if (!relativePath) return "";
  return `${req.protocol}://${req.get("host")}${relativePath.startsWith("/") ? relativePath : `/${relativePath}`}`;
};

const sanitizeSettings = (settings, req) => {
  const data = settings.toObject ? settings.toObject() : settings;
  return {
    ...data,
    logo: buildAssetUrl(req, data.logo),
    favicon: buildAssetUrl(req, data.favicon),
    pdfLogo: buildAssetUrl(req, data.pdfLogo),
  };
};

const getAppSettings = async (req, res) => {
  try {
    const settings = await ensureSettings();
    res.status(200).json({
      success: true,
      data: sanitizeSettings(settings, req),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch app settings",
      error: error.message,
    });
  }
};

const updateAppSettings = async (req, res) => {
  try {
    const settings = await ensureSettings();
    const allowedFields = [
      "schoolName",
      "tagline",
      "pdfHeaderText",
      "pdfFooterText",
      "pdfPrimaryColor",
      "pdfFontFamily",
      "pdfPageSize",
      "themeColor",
      "accentColor",
      "fontFamily",
      "address",
      "phone",
      "email",
      "website",
      "maintenanceMode",
      "showAccountingBalancesToUsers",
    ];

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        settings[field] = req.body[field];
      }
    });

    settings.updatedBy = req.user?._id || req.user?.id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: sanitizeSettings(settings, req),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update app settings",
      error: error.message,
    });
  }
};

const updateBrandingAsset = async (req, res, fieldName) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const settings = await ensureSettings();
    const relativeFilePath = `/uploads/branding/${req.file.filename}`;

    const previousPath = settings[fieldName];
    if (previousPath && previousPath !== relativeFilePath) {
      const absolutePrevious = path.join(process.cwd(), previousPath.replace(/^\//, ""));
      if (fs.existsSync(absolutePrevious)) {
        fs.unlinkSync(absolutePrevious);
      }
    }

    settings[fieldName] = relativeFilePath;
    settings.updatedBy = req.user?._id || req.user?.id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: `${fieldName} updated successfully`,
      data: {
        [fieldName]: buildAssetUrl(req, relativeFilePath),
        settings: sanitizeSettings(settings, req),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to upload branding asset",
      error: error.message,
    });
  }
};

const uploadLogo = async (req, res) => updateBrandingAsset(req, res, "logo");
const uploadFavicon = async (req, res) => updateBrandingAsset(req, res, "favicon");
const uploadPdfLogo = async (req, res) => updateBrandingAsset(req, res, "pdfLogo");

export {
  getAppSettings,
  updateAppSettings,
  uploadLogo,
  uploadFavicon,
  uploadPdfLogo,
};
