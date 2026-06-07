import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const sourceURI =
  process.env.DB_URI || process.env.LOCAL_DB_URI || process.env.DEV_DB_URI;
const backupDir = path.join(process.cwd(), "seeders", "backup");
const backupFile = path.join(backupDir, "backup.json");

const backupDatabase = async () => {
  try {
    if (!sourceURI) {
      throw new Error(
        "Missing DB_URI, LOCAL_DB_URI, or DEV_DB_URI in .env. Add your database connection string before running backup.",
      );
    }

    console.log("Starting database backup...");
    console.log(`Connecting to source database: ${sourceURI}`);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`Created backup directory: ${backupDir}`);
    }

    await mongoose.connect(sourceURI);
    console.log("Connected to source database.");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);

    const backupData = {};

    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`Exporting collection: ${collectionName}`);

      const data = await db.collection(collectionName).find({}).toArray();
      backupData[collectionName] = data;
      console.log(`Exported ${data.length} documents`);
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`Backup saved successfully to: ${backupFile}`);
  } catch (error) {
    console.error("Backup error:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database");
    process.exit();
  }
};

backupDatabase();
