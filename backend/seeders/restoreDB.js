import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const targetURI = process.env.LOCAL_DB_URI || process.env.DB_URI;
const backupFile = path.join(process.cwd(), "seeders", "backup", "backup.json");

const isoDateRegex =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const reviveSpecialTypes = (value) => {
  if (Array.isArray(value)) {
    return value.map(reviveSpecialTypes);
  }

  if (!value || typeof value !== "object") {
    if (typeof value === "string" && isoDateRegex.test(value)) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    return value;
  }

  const revived = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    revived[key] = reviveSpecialTypes(nestedValue);
  }
  return revived;
};

const buildUniqueKey = (document, fields) => {
  const values = fields.map((field) => {
    const value = document[field];
    return `${field}:${JSON.stringify(value)}`;
  });

  return values.join("|");
};

const removeInBatchDuplicates = async (collection, collectionName, documents) => {
  let indexes = [];

  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (
      error.codeName === "NamespaceNotFound" ||
      error.message.includes("ns does not exist")
    ) {
      return { filteredDocuments: documents, skippedCount: 0 };
    }

    throw error;
  }

  const uniqueIndexes = indexes
    .filter((index) => index.unique)
    .map((index) => Object.keys(index.key));

  if (uniqueIndexes.length === 0) {
    return { filteredDocuments: documents, skippedCount: 0 };
  }

  const seenKeysByIndex = uniqueIndexes.map(() => new Set());
  const filteredDocuments = [];
  let skippedCount = 0;

  for (const document of documents) {
    let isDuplicate = false;

    for (let i = 0; i < uniqueIndexes.length; i += 1) {
      const fields = uniqueIndexes[i];
      const hasAllFields = fields.every((field) => document[field] !== undefined);

      if (!hasAllFields) {
        continue;
      }

      const uniqueKey = buildUniqueKey(document, fields);
      if (seenKeysByIndex[i].has(uniqueKey)) {
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      skippedCount += 1;
      continue;
    }

    filteredDocuments.push(document);

    for (let i = 0; i < uniqueIndexes.length; i += 1) {
      const fields = uniqueIndexes[i];
      const hasAllFields = fields.every((field) => document[field] !== undefined);

      if (hasAllFields) {
        seenKeysByIndex[i].add(buildUniqueKey(document, fields));
      }
    }
  }

  if (skippedCount > 0) {
    console.log(
      `Skipped ${skippedCount} duplicate documents in backup for collection: ${collectionName}`,
    );
  }

  return { filteredDocuments, skippedCount };
};

const restoreDatabase = async () => {
  try {
    if (!targetURI) {
      throw new Error(
        "Missing DB_URI in .env. Add your local database connection string before running restore.",
      );
    }

    console.log("Starting database restore...");
    console.log(`Target database: ${targetURI}`);

    if (!fs.existsSync(backupFile)) {
      console.error(`Backup file not found: ${backupFile}`);
      console.log("Please run: node seeders/backupDB.js first");
      process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, "utf8"));
    console.log("Backup file loaded successfully.");

    await mongoose.connect(targetURI);
    console.log("Connected to target database.");

    const db = mongoose.connection.db;
    let totalDocuments = 0;

    for (const [collectionName, documents] of Object.entries(backupData)) {
      console.log(`Restoring collection: ${collectionName}`);

      const collection = db.collection(collectionName);

      await collection.deleteMany({});
      console.log("Cleared existing documents");

      if (documents.length > 0) {
        const revivedDocuments = documents.map(reviveSpecialTypes);

        const { filteredDocuments } = await removeInBatchDuplicates(
          collection,
          collectionName,
          revivedDocuments,
        );

        try {
          const result = await collection.insertMany(filteredDocuments, {
            ordered: false,
          });
          console.log(`Inserted ${result.insertedCount} documents`);
          totalDocuments += result.insertedCount;
        } catch (error) {
          if (error.code === 11000 || error.writeErrors?.some((item) => item.code === 11000)) {
            const insertedCount = error.result?.result?.nInserted ?? error.insertedCount ?? 0;
            console.log(
              `Duplicate key conflicts were skipped while restoring ${collectionName}. Inserted ${insertedCount} documents.`,
            );
            totalDocuments += insertedCount;
          } else {
            throw error;
          }
        }
      } else {
        console.log("No documents to insert");
      }
    }

    console.log(`Total documents restored: ${totalDocuments}`);
  } catch (error) {
    console.error("Restore error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
    process.exit();
  }
};

restoreDatabase();
