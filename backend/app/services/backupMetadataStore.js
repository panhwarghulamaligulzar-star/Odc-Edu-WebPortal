import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isSameOrChildPath = (parentPath, candidatePath) => {
  const relativePath = path.relative(parentPath, candidatePath);
  return (
    relativePath === "" ||
    (relativePath !== ".." &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
};

const getStorageDirectory = () => {
  const storageDirectory = path.resolve(
    process.env.DATABASE_BACKUP_DIR ||
      path.join(__dirname, "../../var/database-backups"),
  );
  const publicDirectory = path.resolve(__dirname, "../../public");
  const uploadsDirectory = path.resolve(
    __dirname,
    "../../",
    process.env.UPLOADS_DIR || "./uploads",
  );
  if (
    [publicDirectory, uploadsDirectory].some(
      (directory) =>
        isSameOrChildPath(storageDirectory, directory) ||
        isSameOrChildPath(directory, storageDirectory),
    )
  ) {
    throw new Error(
      "Database backup storage must be outside public and uploads directories.",
    );
  }
  return storageDirectory;
};
const getMetadataPath = () =>
  path.join(getStorageDirectory(), "backups.json");
let mutationQueue = Promise.resolve();

const serializeMutation = (operation) => {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.catch(() => {});
  return result;
};

const readAll = async () => {
  try {
    const contents = await fs.readFile(getMetadataPath(), "utf8");
    const records = JSON.parse(contents);
    if (!Array.isArray(records)) {
      throw new Error("Backup metadata must be a JSON array.");
    }
    return records;
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
};

const writeAll = async (records) => {
  const storageDirectory = getStorageDirectory();
  await fs.mkdir(storageDirectory, { recursive: true, mode: 0o700 });
  const temporaryPath = path.join(
    storageDirectory,
    `.backups-${process.pid}-${randomUUID()}.tmp`,
  );
  try {
    await fs.writeFile(temporaryPath, JSON.stringify(records, null, 2), {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    await fs.rename(temporaryPath, getMetadataPath());
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
};

export const getBackupStorageDirectory = getStorageDirectory;

export const listBackupRecords = async (environment) =>
  (await readAll())
    .filter((record) => record.environment === environment)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

export const findBackupRecord = async (environment, id) =>
  (await readAll()).find(
    (record) => record.environment === environment && record.id === id,
  ) || null;

export const addBackupRecord = (record) =>
  serializeMutation(async () => {
    const records = await readAll();
    records.push(record);
    await writeAll(records);
    return record;
  });

export const updateBackupRecord = (id, changes) =>
  serializeMutation(async () => {
    const records = await readAll();
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) return null;
    records[index] = { ...records[index], ...changes };
    await writeAll(records);
    return records[index];
  });

export const removeBackupRecord = (id) =>
  serializeMutation(async () => {
    const records = await readAll();
    const filteredRecords = records.filter((record) => record.id !== id);
    if (filteredRecords.length === records.length) return false;
    await writeAll(filteredRecords);
    return true;
  });
