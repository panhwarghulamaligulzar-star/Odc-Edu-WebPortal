import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Source database URI (remote production)
const sourceURI = "mongodb+srv://asadalib4_db_user:asadaliEdu25@cluster0.dthjlbf.mongodb.net";

// Backup file path
const backupDir = path.join(process.cwd(), "seeders", "backup");
const backupFile = path.join(backupDir, "backup.json");

const backupDatabase = async () => {
  try {
    console.log("🔍 Starting database backup...");
    console.log(`📡 Connecting to: ${sourceURI}`);

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${backupDir}`);
    }

    // Connect to MongoDB
    await mongoose.connect(sourceURI);
    console.log("✅ Connected to source database!");

    const db = mongoose.connection.db;

    // Get all collections
    console.log("🔎 Fetching all collections...");
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections`);

    const backupData = {};

    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`\n📤 Exporting collection: ${collectionName}`);

      const data = await db.collection(collectionName).find({}).toArray();
      backupData[collectionName] = data;
      console.log(`   ✅ Exported ${data.length} documents`);
    }

    // Save to JSON file
    console.log(`\n💾 Saving backup to: ${backupFile}`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log("✅ Backup saved successfully!");

    // Print summary
    console.log("\n📋 Backup Summary:");
    console.log("==================");
    for (const [collection, data] of Object.entries(backupData)) {
      console.log(`   ${collection}: ${data.length} documents`);
    }

    console.log(`\n✨ Backup file: ${backupFile}`);

  } catch (error) {
    console.error("❌ Backup error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from database");
    process.exit(0);
  }
};

backupDatabase();
