import { spawn } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { createHash, randomUUID } from "crypto";
import { createGunzip } from "zlib";
import { Transform, Writable } from "stream";
import { pipeline } from "stream/promises";
import {
  addBackupRecord,
  findBackupRecord,
  getBackupStorageDirectory,
  listBackupRecords,
  updateBackupRecord,
} from "./backupMetadataStore.js";
import {
  isGoogleDriveConfigured,
  uploadBackupToGoogleDrive,
} from "./googleDriveBackupService.js";

const ENVIRONMENTS = new Set(["local", "production"]);
const PRODUCTION_BACKUP_CONFIRMATION = "BACK UP LIVE PRODUCTION";
const PRODUCTION_DELETE_CONFIRMATION = "DELETE LIVE PRODUCTION BACKUP";
const DOWNLOAD_TICKET_TTL_MS = 60_000;
const activeBackupJobs = new Map();
const downloadTickets = new Map();

const assertEnvironment = (environment) => {
  if (!ENVIRONMENTS.has(environment)) {
    const error = new Error("Unsupported database environment.");
    error.statusCode = 400;
    throw error;
  }
};

const getMongoUri = (environment) => {
  assertEnvironment(environment);
  return environment === "local"
    ? process.env.LOCAL_MONGO_URI || process.env.LOCAL_DB_URI
    : process.env.PRODUCTION_MONGO_URI;
};

const getDatabaseName = (uri) => {
  try {
    return decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, ""));
  } catch {
    return "unknown";
  }
};

const makeTimestamp = () =>
  new Date().toISOString().replace(/[:.]/g, "-");

const getMongoIdentity = (uri) => {
  try {
    const parsedUri = new URL(uri);
    const hostname = parsedUri.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const normalizedHost =
      hostname === "localhost" ||
      hostname === "::1" ||
      /^127(?:\.\d{1,3}){3}$/.test(hostname)
        ? "loopback"
        : hostname;
    return `${normalizedHost}:${parsedUri.port || (parsedUri.protocol === "mongodb+srv:" ? "srv" : "27017")}/${decodeURIComponent(parsedUri.pathname.replace(/^\/+/, ""))}`;
  } catch {
    return null;
  }
};

const isLoopbackMongoUri = (uri) => {
  const identity = getMongoIdentity(uri);
  return identity?.startsWith("loopback:");
};

const createAuditLogger = async (environment, action, actorId, outcome) => {
  if (environment !== "production") return;
  await fsp.mkdir(getBackupStorageDirectory(), { recursive: true, mode: 0o700 });
  await fsp.chmod(getBackupStorageDirectory(), 0o700);
  await fsp.appendFile(
    path.join(getBackupStorageDirectory(), "production-audit.jsonl"),
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      environment,
      action,
      actorId: String(actorId || "unknown"),
      outcome,
    })}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
};

const withAudit = async (environment, action, actorId, operation) => {
  assertEnvironment(environment);
  await createAuditLogger(environment, action, actorId, "started");
  try {
    const result = await operation();
    await createAuditLogger(environment, action, actorId, "succeeded");
    return result;
  } catch (error) {
    await createAuditLogger(environment, action, actorId, "failed");
    throw error;
  }
};

const getSafeBackupPath = (record) => {
  if (
    !record ||
    path.basename(record.filename) !== record.filename ||
    !record.filename.endsWith(".archive.gz")
  ) {
    const error = new Error("Backup file is invalid.");
    error.statusCode = 404;
    throw error;
  }
  const backupPath = path.resolve(getBackupStorageDirectory(), record.filename);
  const root = path.resolve(getBackupStorageDirectory()) + path.sep;
  if (!backupPath.startsWith(root)) {
    const error = new Error("Backup file is invalid.");
    error.statusCode = 404;
    throw error;
  }
  return backupPath;
};

const requireConfiguredUri = (environment) => {
  const uri = getMongoUri(environment);
  if (!uri) {
    const error = new Error(
      environment === "production"
        ? "Production database is not configured. Set PRODUCTION_MONGO_URI on the backend."
        : "Local database is not configured. Set LOCAL_MONGO_URI on the backend.",
    );
    error.statusCode = 503;
    throw error;
  }
  const localUri = process.env.LOCAL_MONGO_URI || process.env.LOCAL_DB_URI;
  const productionUri = process.env.PRODUCTION_MONGO_URI;
  if (
    localUri &&
    productionUri &&
    getMongoIdentity(localUri) &&
    getMongoIdentity(localUri) === getMongoIdentity(productionUri)
  ) {
    const error = new Error(
      "Production and local MongoDB connection strings must be configured separately.",
    );
    error.statusCode = 409;
    throw error;
  }
  if (environment === "production" && isLoopbackMongoUri(uri)) {
    const error = new Error(
      "Production MongoDB must use a non-loopback host.",
    );
    error.statusCode = 409;
    throw error;
  }
  return uri;
};

const hasLocalBackupReadiness = async () => {
  const localBackups = await listBackupRecords("local");
  return localBackups.some(
    (record) =>
      record.status === "completed" &&
      record.verification?.verified === true &&
      record.downloadedAt &&
      new Date(record.downloadedAt) >= new Date(record.verification.verifiedAt),
  );
};

const requireLocalBackupReadiness = async (environment) => {
  if (environment === "production" && !(await hasLocalBackupReadiness())) {
    const error = new Error(
      "Production operations are locked until a local backup is integrity-verified and downloaded.",
    );
    error.statusCode = 412;
    throw error;
  }
};

const inspectDatabase = async (uri) => {
  const connection = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 1,
  });
  try {
    await connection.asPromise();
    const database = connection.db;
    const [stats, collections] = await Promise.all([
      database.stats().catch(() => null),
      database.listCollections({}, { nameOnly: true }).toArray(),
    ]);
    let documentCount = 0;
    let documentCountAvailable = true;
    for (const collectionInfo of collections) {
      try {
        documentCount += await database
          .collection(collectionInfo.name)
          .estimatedDocumentCount();
      } catch {
        documentCountAvailable = false;
      }
    }
    return {
      status: "connected",
      databaseName: database.databaseName,
      databaseSizeBytes: stats
        ? Number(stats.storageSize || stats.dataSize || 0)
        : null,
      totalCollections: collections.length,
      totalDocuments: documentCountAvailable ? documentCount : null,
    };
  } finally {
    await connection.close();
  }
};

const getMongoDumpExecutable = () => {
  const configuredExecutable = process.env.MONGODUMP_PATH?.trim();
  if (configuredExecutable) return configuredExecutable;

  if (process.platform === "win32") {
    const toolsDirectory = path.join(
      process.env.ProgramFiles || "C:\\Program Files",
      "MongoDB",
      "Tools",
    );
    try {
      const installedVersions = fs
        .readdirSync(toolsDirectory, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) =>
          right.localeCompare(left, undefined, { numeric: true }),
        );
      const installedExecutable = installedVersions
        .map((version) =>
          path.join(toolsDirectory, version, "bin", "mongodump.exe"),
        )
        .find((candidate) => fs.existsSync(candidate));
      if (installedExecutable) return installedExecutable;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return "mongodump";
};

const runMongoDump = (argumentsList) =>
  new Promise((resolve, reject) => {
    const configuredExecutable = process.env.MONGODUMP_PATH?.trim();
    const executable = getMongoDumpExecutable();
    const child = spawn(executable, argumentsList, {
      windowsHide: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        const missingToolError = new Error(
          configuredExecutable
            ? "mongodump was not found at MONGODUMP_PATH. Check the executable path and restart the backend."
            : "mongodump is not installed or is not on the backend PATH. Install MongoDB Database Tools and restart the backend, or set MONGODUMP_PATH to mongodump.exe.",
        );
        missingToolError.statusCode = 503;
        reject(missingToolError);
        return;
      }
      const startError = new Error(
        configuredExecutable
          ? "Could not start mongodump at MONGODUMP_PATH. Check its executable path."
          : "Could not start mongodump. Check the MongoDB Database Tools installation.",
      );
      startError.statusCode = 503;
      reject(startError);
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      const dumpError = new Error(
        `mongodump failed (exit ${code}). Check MongoDB Database Tools and database access.`,
      );
      dumpError.statusCode = 502;
      reject(dumpError);
    });
  });

const reconcileInterruptedBackups = async (environment) => {
  const records = await listBackupRecords(environment);
  for (const record of records) {
    if (record.status !== "in_progress" || activeBackupJobs.has(record.id)) {
      continue;
    }

    if (/^[\da-f-]{36}$/i.test(record.id)) {
      await fsp.rm(
        path.join(getBackupStorageDirectory(), `.mongodump-${record.id}.yaml`),
        { force: true },
      );
    }
    if (record.filename && path.basename(record.filename) === record.filename) {
      await fsp.rm(
        path.join(getBackupStorageDirectory(), record.filename),
        { force: true },
      );
    }
    await updateBackupRecord(record.id, {
      status: "failed",
      completedAt: new Date().toISOString(),
      errorMessage:
        "The backup was interrupted by a backend restart. Start a new backup.",
    });
  }
};

const executeBackupJob = async ({
  environment,
  actorId,
  id,
  uri,
  backupPath,
  configPath,
}) => {
  try {
    await withAudit(environment, "backup_job", actorId, async () => {
      let jobError;
      try {
        await fsp.writeFile(configPath, `uri: ${JSON.stringify(uri)}\n`, {
          encoding: "utf8",
          mode: 0o600,
          flag: "wx",
        });
        await runMongoDump([
          "--config",
          configPath,
          `--archive=${backupPath}`,
          "--gzip",
        ]);
        const fileStats = await fsp.stat(backupPath);
        if (!fileStats.isFile() || fileStats.size === 0) {
          throw new Error("mongodump produced an empty backup file.");
        }
      } catch (error) {
        jobError = error;
      }

      try {
        await fsp.rm(configPath, { force: true });
      } catch {
        console.error("Could not remove temporary mongodump credentials file.");
        jobError ||= new Error(
          "The temporary MongoDB credentials file could not be removed.",
        );
      }

      if (jobError) {
        try {
          await fsp.rm(backupPath, { force: true });
        } catch {
          console.error("Could not remove failed database backup file.");
        }
        await updateBackupRecord(id, {
          status: "failed",
          completedAt: new Date().toISOString(),
          errorMessage: jobError.message,
        });
        throw jobError;
      }

      const fileStats = await fsp.stat(backupPath);
      const updated = await updateBackupRecord(id, {
        sizeBytes: fileStats.size,
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      if (!updated) {
        throw new Error("Backup metadata could not be updated.");
      }
    });
  } catch (error) {
    console.error("Database backup job failed.", {
      environment,
      backupId: id,
      error: error.message,
    });
  } finally {
    activeBackupJobs.delete(id);
  }
};

const getEnvironmentOverview = async (environment, actorId) =>
  withAudit(environment, "overview", actorId, async () => {
    const uri = getMongoUri(environment);
    const records = await listBackupRecords(environment);
    const productionOperationsEnabled =
      environment !== "production" || (await hasLocalBackupReadiness());
    const latestSuccessful = records.find(
      (record) =>
        record.status === "completed" || record.status === "deleted_local",
    );
    if (environment === "production" && !uri) {
      return {
        environment,
        configured: false,
        connection: { status: "not_configured" },
        databaseName: null,
        databaseSizeBytes: null,
        totalCollections: null,
        totalDocuments: null,
        lastSuccessfulBackup: latestSuccessful || null,
        totalBackups: records.filter(
          (record) =>
            record.status === "completed" ||
            (record.status === "deleted_local" && record.googleDriveFileId),
        ).length,
        googleDriveConfigured: isGoogleDriveConfigured(),
        productionRestoreEnabled: false,
        productionOperationsEnabled: false,
        connectionError:
          process.env.DB_URI || process.env.MONGODB_URI
            ? "Live production backups are not configured. This module requires PRODUCTION_MONGO_URI; DB_URI and MONGODB_URI are reserved for the application's primary connection and are not used as a backup target. Set PRODUCTION_MONGO_URI in the backend environment, then restart the backend."
            : "Live production backups are not configured. Set PRODUCTION_MONGO_URI in the backend deployment's secret/environment settings, then restart the backend.",
      };
    }
    if (environment === "production" && !productionOperationsEnabled) {
      return {
        environment,
        configured: Boolean(uri),
        connection: { status: "locked" },
        databaseName: null,
        databaseSizeBytes: null,
        totalCollections: null,
        totalDocuments: null,
        lastSuccessfulBackup: latestSuccessful || null,
        totalBackups: records.filter(
          (record) =>
            record.status === "completed" ||
            (record.status === "deleted_local" && record.googleDriveFileId),
        ).length,
        googleDriveConfigured: isGoogleDriveConfigured(),
        productionRestoreEnabled: false,
        productionOperationsEnabled: false,
        connectionError:
          "Complete a local backup, verify its integrity, and download it before production access is unlocked.",
      };
    }
    if (!uri) {
      return {
        environment,
        configured: false,
        connection: { status: "not_configured" },
        databaseName: null,
        databaseSizeBytes: null,
        totalCollections: null,
        totalDocuments: null,
        lastSuccessfulBackup: latestSuccessful || null,
        totalBackups: records.filter(
          (record) =>
            record.status === "completed" ||
            (record.status === "deleted_local" && record.googleDriveFileId),
        ).length,
        googleDriveConfigured: isGoogleDriveConfigured(),
        productionRestoreEnabled: false,
        productionOperationsEnabled,
      };
    }
    try {
      const info = await inspectDatabase(requireConfiguredUri(environment));
      return {
        environment,
        configured: true,
        connection: { status: info.status },
        ...info,
        lastSuccessfulBackup: latestSuccessful || null,
        totalBackups: records.filter(
          (record) =>
            record.status === "completed" ||
            (record.status === "deleted_local" && record.googleDriveFileId),
        ).length,
        googleDriveConfigured: isGoogleDriveConfigured(),
        productionRestoreEnabled: false,
        productionOperationsEnabled,
      };
    } catch (error) {
      return {
        environment,
        configured: true,
        connection: {
          status: error.statusCode === 409 ? "misconfigured" : "disconnected",
        },
        databaseName: getDatabaseName(uri),
        databaseSizeBytes: null,
        totalCollections: null,
        totalDocuments: null,
        lastSuccessfulBackup: latestSuccessful || null,
        totalBackups: records.filter(
          (record) =>
            record.status === "completed" ||
            (record.status === "deleted_local" && record.googleDriveFileId),
        ).length,
        googleDriveConfigured: isGoogleDriveConfigured(),
        productionRestoreEnabled: false,
        productionOperationsEnabled,
        connectionError:
          error.statusCode === 409
            ? error.message
            : "Unable to connect to the selected database.",
      };
    }
  });

export const getBackupOverview = getEnvironmentOverview;

export const getBackupHistory = async (environment, actorId) =>
  withAudit(environment, "history", actorId, async () => {
    await reconcileInterruptedBackups(environment);
    const records = await listBackupRecords(environment);
    return records.map((record) => ({
      ...record,
      downloadAvailable: record.status === "completed",
    }));
  });

export const createDatabaseBackup = async (
  environment,
  actorId,
  confirmation,
  actorLabel,
) =>
  withAudit(environment, "backup", actorId, async () => {
    if (
      environment === "production" &&
      confirmation !== PRODUCTION_BACKUP_CONFIRMATION
    ) {
      const error = new Error(
        `Production backup requires confirmation: ${PRODUCTION_BACKUP_CONFIRMATION}`,
      );
      error.statusCode = 400;
      throw error;
    }

    await requireLocalBackupReadiness(environment);
    if (
      [...activeBackupJobs.values()].some(
        (activeEnvironment) => activeEnvironment === environment,
      )
    ) {
      const error = new Error(
        "A backup for this environment is already running. Check backup history before starting another.",
      );
      error.statusCode = 409;
      throw error;
    }
    const uri = requireConfiguredUri(environment);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    const filename = `${environment}-backup-${makeTimestamp()}-${id}.archive.gz`;
    const backupPath = path.join(getBackupStorageDirectory(), filename);
    const configPath = path.join(
      getBackupStorageDirectory(),
      `.mongodump-${id}.yaml`,
    );
    const record = {
      id,
      environment,
      databaseName: getDatabaseName(uri),
      filename,
      sizeBytes: 0,
      createdAt,
      status: "in_progress",
      storageLocation: "server",
      createdBy: String(actorLabel || actorId || "unknown"),
      googleDriveStatus: "not_uploaded",
    };

    await fsp.mkdir(getBackupStorageDirectory(), {
      recursive: true,
      mode: 0o700,
    });
    await fsp.chmod(getBackupStorageDirectory(), 0o700);
    activeBackupJobs.set(id, environment);
    try {
      await addBackupRecord(record);
    } catch (error) {
      activeBackupJobs.delete(id);
      throw error;
    }

    process.nextTick(() => {
      void executeBackupJob({
        environment,
        actorId,
        id,
        uri,
        backupPath,
        configPath,
      });
    });
    return record;
  });

export const getBackupDownload = async (environment, id, actorId) =>
  withAudit(environment, "download", actorId, async () => {
    await requireLocalBackupReadiness(environment);
    const record = await findBackupRecord(environment, id);
    if (!record || record.status !== "completed") {
      const error = new Error("Completed backup was not found.");
      error.statusCode = 404;
      throw error;
    }
    const filePath = getSafeBackupPath(record);
    const fileStats = await fsp.stat(filePath);
    return { filePath, filename: record.filename, sizeBytes: fileStats.size };
  });

export const createBackupDownloadTicket = async (environment, id, actorId) =>
  withAudit(environment, "download_ticket", actorId, async () => {
    await requireLocalBackupReadiness(environment);
    const record = await findBackupRecord(environment, id);
    if (!record || record.status !== "completed") {
      const error = new Error("Completed backup was not found.");
      error.statusCode = 404;
      throw error;
    }
    await fsp.stat(getSafeBackupPath(record));

    const now = Date.now();
    for (const [ticket, details] of downloadTickets) {
      if (details.expiresAt <= now) downloadTickets.delete(ticket);
    }
    const ticket = randomUUID();
    downloadTickets.set(ticket, {
      environment,
      id,
      actorId,
      expiresAt: now + DOWNLOAD_TICKET_TTL_MS,
    });
    return { ticket };
  });

export const getBackupDownloadByTicket = async (
  environment,
  id,
  ticket,
) => {
  const details = downloadTickets.get(ticket);
  if (
    !details ||
    details.expiresAt <= Date.now() ||
    details.environment !== environment ||
    details.id !== id
  ) {
    downloadTickets.delete(ticket);
    const error = new Error("Download link expired. Request a new download.");
    error.statusCode = 401;
    throw error;
  }
  downloadTickets.delete(ticket);
  return {
    ...(await getBackupDownload(environment, id, details.actorId)),
    actorId: details.actorId,
  };
};

export const markBackupDownloaded = async (environment, id, actorId) =>
  withAudit(environment, "download_completed", actorId, async () => {
    await requireLocalBackupReadiness(environment);
    const record = await findBackupRecord(environment, id);
    if (!record || record.status !== "completed") {
      const error = new Error("Completed backup was not found.");
      error.statusCode = 404;
      throw error;
    }
    return updateBackupRecord(id, { downloadedAt: new Date().toISOString() });
  });

export const verifyDatabaseBackup = async (environment, id, actorId) =>
  withAudit(environment, "verify", actorId, async () => {
    await requireLocalBackupReadiness(environment);
    const record = await findBackupRecord(environment, id);
    if (!record || record.status !== "completed") {
      const error = new Error("Completed backup was not found.");
      error.statusCode = 404;
      throw error;
    }
    const filePath = getSafeBackupPath(record);
    const hash = createHash("sha256");
    let uncompressedBytes = 0;
    const hashStream = new Transform({
      transform(chunk, _encoding, callback) {
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    const countStream = new Writable({
      write(chunk, _encoding, callback) {
        uncompressedBytes += chunk.length;
        callback();
      },
    });
    try {
      await pipeline(
        fs.createReadStream(filePath),
        hashStream,
        createGunzip(),
        countStream,
      );
    } catch {
      const error = new Error(
        "Backup integrity verification failed; the gzip archive is corrupt or unreadable.",
      );
      error.statusCode = 422;
      throw error;
    }
    const verification = {
      verified: true,
      method: "gzip_crc32_and_sha256",
      sha256: hash.digest("hex"),
      uncompressedSizeBytes: uncompressedBytes,
      verifiedAt: new Date().toISOString(),
    };
    await updateBackupRecord(id, { verification });
    return verification;
  });

export const deleteDatabaseBackup = async (
  environment,
  id,
  actorId,
  confirmation,
) =>
  withAudit(environment, "delete_backup", actorId, async () => {
    await requireLocalBackupReadiness(environment);
    if (
      environment === "production" &&
      confirmation !== PRODUCTION_DELETE_CONFIRMATION
    ) {
      const error = new Error(
        `Deleting a production backup requires confirmation: ${PRODUCTION_DELETE_CONFIRMATION}`,
      );
      error.statusCode = 400;
      throw error;
    }
    const record = await findBackupRecord(environment, id);
    if (!record) {
      const error = new Error("Backup was not found.");
      error.statusCode = 404;
      throw error;
    }
    if (record.status === "completed") {
      await fsp.rm(getSafeBackupPath(record), { force: false });
    }
    const updated = await updateBackupRecord(id, {
      status: record.googleDriveFileId ? "deleted_local" : "deleted",
      storageLocation: record.googleDriveFileId ? "google_drive" : "removed",
      deletedAt: new Date().toISOString(),
    });
    if (!updated) {
      const error = new Error("Backup metadata could not be updated.");
      error.statusCode = 500;
      throw error;
    }
    return { deleted: true, backup: updated };
  });

export const uploadDatabaseBackupToDrive = async (
  environment,
  id,
  actorId,
) =>
  withAudit(environment, "google_drive_upload", actorId, async () => {
    await requireLocalBackupReadiness(environment);
    const record = await findBackupRecord(environment, id);
    if (!record || record.status !== "completed") {
      const error = new Error("Completed backup was not found.");
      error.statusCode = 404;
      throw error;
    }
    if (record.googleDriveFileId) {
      const error = new Error(
        "A Google Drive file already exists for this backup; avoid creating a duplicate.",
      );
      error.statusCode = 409;
      throw error;
    }
    let result;
    try {
      result = await uploadBackupToGoogleDrive({
        environment,
        filename: record.filename,
        filePath: getSafeBackupPath(record),
      });
    } catch (error) {
      await updateBackupRecord(id, {
        googleDriveStatus: "failed",
        ...(error.uploadedFile
          ? {
              googleDriveFileId: error.uploadedFile.fileId,
              googleDriveFileName: error.uploadedFile.filename,
              googleDriveMd5Checksum: error.uploadedFile.md5Checksum,
              googleDriveEncrypted: error.uploadedFile.encrypted,
              googleDriveUploadedAt: new Date().toISOString(),
            }
          : {}),
      });
      throw error;
    }
    const updated = await updateBackupRecord(id, {
      googleDriveStatus: result.verified ? "uploaded" : "failed",
      googleDriveFileId: result.fileId,
      googleDriveFileName: result.filename,
      googleDriveMd5Checksum: result.driveMd5Checksum,
      googleDriveUploadedAt: new Date().toISOString(),
      googleDriveEncrypted: result.encrypted,
      storageLocation: "server,google_drive",
      ...(result.verified
        ? { googleDriveVerifiedAt: new Date().toISOString() }
        : {}),
      ...(result.encryption ? { googleDriveEncryption: result.encryption } : {}),
    });
    if (!result.verified) {
      const error = new Error(
        "Google Drive upload integrity check failed; the uploaded file was retained for investigation.",
      );
      error.statusCode = 502;
      throw error;
    }
    return updated;
  });
