import fs from "fs";
import { createCipheriv, createHash, randomBytes } from "crypto";
import { Transform } from "stream";
import { google } from "googleapis";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const BACKUP_FOLDER_NAME = "ODC Database Backups";
const ENVIRONMENT_FOLDER_NAMES = {
  local: "Local Development",
  production: "Live Production",
};

let driveClientPromise;

const getDriveClient = async () => {
  const credentialsValue = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  if (!credentialsValue) {
    const error = new Error("Google Drive integration is not configured.");
    error.statusCode = 503;
    throw error;
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsValue);
  } catch {
    const error = new Error(
      "GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON.",
    );
    error.statusCode = 503;
    throw error;
  }

  if (!driveClientPromise) {
    driveClientPromise = (async () => {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      return google.drive({ version: "v3", auth: await auth.getClient() });
    })().catch((error) => {
      driveClientPromise = undefined;
      throw error;
    });
  }

  return driveClientPromise;
};

const findOrCreateFolder = async (drive, name, parentId, driveId) => {
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const response = await drive.files.list({
    q: `name = '${name}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false${parentClause}`,
    pageSize: 1,
    fields: "files(id,name)",
    ...(driveId ? { corpora: "drive", driveId } : { corpora: "user" }),
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existingFolder = response.data.files?.[0];
  if (existingFolder?.id) return existingFolder.id;

  const createdFolder = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME_TYPE,
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: "id",
    supportsAllDrives: true,
  });

  if (!createdFolder.data.id) {
    throw new Error("Google Drive did not return a folder ID.");
  }
  return createdFolder.data.id;
};

const getEncryptionKey = () => {
  const configuredKey = process.env.BACKUP_DRIVE_ENCRYPTION_KEY;
  if (!configuredKey) return null;

  const key = Buffer.from(configuredKey, "base64");
  if (key.length !== 32) {
    throw new Error(
      "BACKUP_DRIVE_ENCRYPTION_KEY must be a base64-encoded 32-byte key.",
    );
  }
  return key;
};

export const isGoogleDriveConfigured = () =>
  Boolean(
    process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON &&
      process.env.GOOGLE_DRIVE_BACKUP_PARENT_ID,
  );

export const uploadBackupToGoogleDrive = async ({
  environment,
  filename,
  filePath,
}) => {
  if (!process.env.GOOGLE_DRIVE_BACKUP_PARENT_ID) {
    const error = new Error(
      "Google Drive requires a shared folder ID in GOOGLE_DRIVE_BACKUP_PARENT_ID.",
    );
    error.statusCode = 503;
    throw error;
  }
  if (!/^[\w-]+$/.test(process.env.GOOGLE_DRIVE_BACKUP_PARENT_ID)) {
    const error = new Error("GOOGLE_DRIVE_BACKUP_PARENT_ID is invalid.");
    error.statusCode = 503;
    throw error;
  }
  const drive = await getDriveClient();
  const parentFolder = await drive.files.get({
    fileId: process.env.GOOGLE_DRIVE_BACKUP_PARENT_ID,
    fields: "id,driveId",
    supportsAllDrives: true,
  });
  const driveId = parentFolder.data.driveId;
  const rootFolderId = await findOrCreateFolder(
    drive,
    BACKUP_FOLDER_NAME,
    process.env.GOOGLE_DRIVE_BACKUP_PARENT_ID,
    driveId,
  );
  const environmentFolderId = await findOrCreateFolder(
    drive,
    ENVIRONMENT_FOLDER_NAMES[environment],
    rootFolderId,
    driveId,
  );

  const key = getEncryptionKey();
  const fileStream = fs.createReadStream(filePath);
  const uploadedHash = createHash("md5");
  const hashStream = new Transform({
    transform(chunk, _encoding, callback) {
      uploadedHash.update(chunk);
      callback(null, chunk);
    },
  });
  let mediaStream = fileStream;
  let encryption = null;

  if (key) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    mediaStream = fileStream.pipe(cipher).pipe(hashStream);
    encryption = { cipher, iv };
  } else {
    mediaStream = fileStream.pipe(hashStream);
  }

  let uploadedFileId = null;
  let uploadedFilename = null;
  let uploadedMd5Checksum = null;
  try {
    const response = await drive.files.create({
      requestBody: {
        name: encryption ? `${filename}.enc` : filename,
        parents: [environmentFolderId],
        description: `Database backup for ${environment} environment.`,
      },
      media: {
        mimeType: encryption ? "application/octet-stream" : "application/gzip",
        body: mediaStream,
      },
      fields: "id,name",
      uploadType: "resumable",
      supportsAllDrives: true,
    });

    if (!response.data.id) {
      throw new Error("Google Drive did not return a file ID.");
    }

    uploadedFileId = response.data.id;
    uploadedFilename = response.data.name || filename;
    uploadedMd5Checksum = uploadedHash.digest("hex");
    const storedFile = await drive.files.get({
      fileId: uploadedFileId,
      fields: "id,name,md5Checksum",
      supportsAllDrives: true,
    });
    const driveMd5Checksum = storedFile.data.md5Checksum?.toLowerCase() || null;

    return {
      fileId: uploadedFileId,
      filename: uploadedFilename,
      uploadedMd5Checksum,
      driveMd5Checksum,
      verified: driveMd5Checksum === uploadedMd5Checksum,
      encrypted: Boolean(encryption),
      ...(encryption
        ? {
            encryption: {
              algorithm: "aes-256-gcm",
              iv: encryption.iv.toString("base64"),
              authTag: encryption.cipher.getAuthTag().toString("base64"),
            },
          }
        : {}),
    };
  } catch (error) {
    fileStream.destroy();
    const uploadError = new Error(
      "Google Drive upload failed. Check service-account access and Drive configuration.",
    );
    uploadError.statusCode = 502;
    if (uploadedFileId) {
      uploadError.uploadedFile = {
        fileId: uploadedFileId,
        filename: uploadedFilename,
        md5Checksum: uploadedMd5Checksum,
        encrypted: Boolean(encryption),
      };
    }
    throw uploadError;
  }
};
