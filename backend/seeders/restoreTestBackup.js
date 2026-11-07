import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const isLoopbackUri = (uri) => {
  let hostname;
  try {
    hostname = new URL(uri).hostname.toLowerCase().replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }
  return (
    hostname === "localhost" ||
    hostname === "::1" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
};

const getLoopbackEndpoint = (uri) => {
  const parsedUri = new URL(uri);
  const hostname = parsedUri.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const normalizedHost =
    hostname === "localhost" || hostname === "::1" || hostname.startsWith("127.")
      ? "loopback"
      : hostname;
  return `${normalizedHost}:${parsedUri.port || "27017"}`;
};

const parseDatabaseName = (uri, variableName) => {
  let databaseName;
  try {
    databaseName = decodeURIComponent(new URL(uri).pathname.replace(/^\/+/, ""));
  } catch {
    throw new Error(`${variableName} must be a valid MongoDB URI.`);
  }
  if (!databaseName) {
    throw new Error(`${variableName} must include a database name.`);
  }
  return databaseName;
};

const runMongoRestore = (argumentsList) =>
  new Promise((resolve, reject) => {
    const executable = process.env.MONGORESTORE_PATH || "mongorestore";
    const child = spawn(executable, argumentsList, {
      windowsHide: true,
      stdio: "inherit",
    });
    child.once("error", (error) => {
      reject(
        error.code === "ENOENT"
          ? new Error(
              "mongorestore was not found. Install MongoDB Database Tools or set MONGORESTORE_PATH.",
            )
          : new Error("Could not start mongorestore."),
      );
    });
    child.once("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`mongorestore failed (exit ${code}).`));
    });
  });

const verifyRestoredDatabase = async (targetUri) => {
  const connection = mongoose.createConnection(targetUri, {
    serverSelectionTimeoutMS: 8000,
    maxPoolSize: 1,
  });
  try {
    await connection.asPromise();
    const database = connection.db;
    const collections = await database
      .listCollections({}, { nameOnly: true })
      .toArray();
    let totalDocuments = 0;
    for (const collectionInfo of collections) {
      totalDocuments += await database
        .collection(collectionInfo.name)
        .estimatedDocumentCount();
    }
    console.log(
      `Restore verified in ${database.databaseName}: ${collections.length} collections, ${totalDocuments} documents.`,
    );
  } finally {
    await connection.close();
  }
};

const restoreTestBackup = async () => {
  const localUri = process.env.LOCAL_MONGO_URI || process.env.LOCAL_DB_URI;
  const targetUri = process.env.LOCAL_RESTORE_TEST_MONGO_URI;
  const backupPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : null;

  if (!localUri || !targetUri) {
    throw new Error(
      "Set LOCAL_MONGO_URI and LOCAL_RESTORE_TEST_MONGO_URI before restoring.",
    );
  }
  if (!isLoopbackUri(localUri) || !isLoopbackUri(targetUri)) {
    throw new Error(
      "Test restore is restricted to loopback MongoDB servers.",
    );
  }
  if (getLoopbackEndpoint(localUri) !== getLoopbackEndpoint(targetUri)) {
    throw new Error(
      "The restore target must use the same local MongoDB server endpoint as LOCAL_MONGO_URI.",
    );
  }

  const sourceDatabaseName = parseDatabaseName(
    localUri,
    "LOCAL_MONGO_URI",
  );
  const targetDatabaseName = parseDatabaseName(
    targetUri,
    "LOCAL_RESTORE_TEST_MONGO_URI",
  );
  if (
    sourceDatabaseName === targetDatabaseName ||
    !/_RESTORE_TEST$/i.test(targetDatabaseName)
  ) {
    throw new Error(
      "The restore target must be a different database ending in _RESTORE_TEST.",
    );
  }
  if (!backupPath || !backupPath.endsWith(".archive.gz")) {
    throw new Error(
      "Provide a local .archive.gz backup path, for example: npm run db:restore-test -- C:\\backups\\local-backup.archive.gz",
    );
  }
  const backupStats = await fs.stat(backupPath);
  if (!backupStats.isFile() || backupStats.size === 0) {
    throw new Error("The selected backup archive is missing or empty.");
  }

  const configPath = path.join(os.tmpdir(), `mongorestore-${randomUUID()}.yaml`);
  try {
    await fs.writeFile(configPath, `uri: ${JSON.stringify(targetUri)}\n`, {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await runMongoRestore([
      "--config",
      configPath,
      `--archive=${backupPath}`,
      "--gzip",
      `--nsInclude=${sourceDatabaseName}.*`,
      `--nsFrom=${sourceDatabaseName}.*`,
      `--nsTo=${targetDatabaseName}.*`,
      "--stopOnError",
    ]);
    await verifyRestoredDatabase(targetUri);
  } finally {
    await fs.rm(configPath, { force: true });
  }
};

restoreTestBackup().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
