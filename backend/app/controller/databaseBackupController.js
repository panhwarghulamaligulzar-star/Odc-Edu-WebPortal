import {
  createBackupDownloadTicket,
  createDatabaseBackup,
  deleteDatabaseBackup,
  getBackupDownload,
  getBackupDownloadByTicket,
  getBackupHistory,
  getBackupOverview,
  markBackupDownloaded,
  uploadDatabaseBackupToDrive,
  verifyDatabaseBackup,
} from "../services/databaseBackupService.js";
import fs from "fs";

const getActorId = (req) => req.user?._id || req.user?.id;
const getActorLabel = (req) =>
  req.user?.name || req.user?.email || String(getActorId(req) || "unknown");

const handleError = (res, error) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error("Database backup operation failed:", error.name);
  return res.status(500).json({ message: "Database backup operation failed." });
};

const streamBackupFile = (res, download, onFinished) => {
  res.status(200);
  res.setHeader("Content-Type", "application/gzip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${download.filename}"`,
  );
  res.setHeader("Content-Length", download.sizeBytes);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  const stream = fs.createReadStream(download.filePath);
  stream.on("error", (error) => {
    if (res.headersSent) {
      res.destroy(error);
    } else {
      handleError(res, error);
    }
  });
  if (onFinished) res.once("finish", onFinished);
  res.once("close", () => {
    if (!res.writableFinished) stream.destroy();
  });
  stream.pipe(res);
};

export const getOverview = async (req, res) => {
  try {
    const overview = await getBackupOverview(req.params.environment, getActorId(req));
    res.json(overview);
  } catch (error) {
    handleError(res, error);
  }
};

export const getHistory = async (req, res) => {
  try {
    const backups = await getBackupHistory(
      req.params.environment,
      getActorId(req),
    );
    res.json({ backups });
  } catch (error) {
    handleError(res, error);
  }
};

export const createBackup = async (req, res) => {
  try {
    const backup = await createDatabaseBackup(
      req.params.environment,
      getActorId(req),
      req.body?.confirmation,
      getActorLabel(req),
    );
    res.status(202).json({ backup });
  } catch (error) {
    handleError(res, error);
  }
};

export const createDownloadTicket = async (req, res) => {
  try {
    const result = await createBackupDownloadTicket(
      req.params.environment,
      req.params.id,
      getActorId(req),
    );
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};

export const downloadBackupByTicket = async (req, res) => {
  try {
    const download = await getBackupDownloadByTicket(
      req.params.environment,
      req.params.id,
      req.params.ticket,
    );
    streamBackupFile(res, download, () => {
      markBackupDownloaded(
        req.params.environment,
        req.params.id,
        download.actorId,
      ).catch((error) => {
        console.error(
          "Could not record completed database backup download:",
          error.name,
        );
      });
    });
  } catch (error) {
    handleError(res, error);
  }
};

export const downloadBackup = async (req, res) => {
  try {
    const download = await getBackupDownload(
      req.params.environment,
      req.params.id,
      getActorId(req),
    );
    streamBackupFile(res, download);
  } catch (error) {
    handleError(res, error);
  }
};

export const confirmDownload = async (req, res) => {
  try {
    const backup = await markBackupDownloaded(
      req.params.environment,
      req.params.id,
      getActorId(req),
    );
    res.json({ downloadedAt: backup.downloadedAt });
  } catch (error) {
    handleError(res, error);
  }
};

export const verifyBackup = async (req, res) => {
  try {
    const verification = await verifyDatabaseBackup(
      req.params.environment,
      req.params.id,
      getActorId(req),
    );
    res.json({ verification });
  } catch (error) {
    handleError(res, error);
  }
};

export const deleteBackup = async (req, res) => {
  try {
    const result = await deleteDatabaseBackup(
      req.params.environment,
      req.params.id,
      getActorId(req),
      req.body?.confirmation,
    );
    res.json(result);
  } catch (error) {
    handleError(res, error);
  }
};

export const uploadBackupToDrive = async (req, res) => {
  try {
    const backup = await uploadDatabaseBackupToDrive(
      req.params.environment,
      req.params.id,
      getActorId(req),
    );
    res.json({ backup });
  } catch (error) {
    handleError(res, error);
  }
};
