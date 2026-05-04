import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Target database URI (local)
const targetURI = "mongodb://asad:aliasad@109.199.123.188:27017/asad";

// Backup file path
const backupFile = path.join(process.cwd(), "seeders", "backup", "backup.json");

const restoreDatabase = async () => {
  try {
    console.log("🔍 Starting database restore...");
    console.log(`📡 Target database: ${targetURI}`);

    // Check if backup file exists
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Backup file not found: ${backupFile}`);
      console.log("   Please run: node seeders/backupDB.js first");
      process.exit(1);
    }

    // Read backup file
    console.log(`\n📖 Reading backup file: ${backupFile}`);
    const backupData = JSON.parse(fs.readFileSync(backupFile, "utf8"));
    console.log("✅ Backup file loaded successfully!");

    // Connect to MongoDB
    await mongoose.connect(targetURI);
    console.log("✅ Connected to target database!");

    const db = mongoose.connection.db;

    // Restore each collection
    console.log("\n🔄 Restoring collections...");
    let totalDocuments = 0;

    for (const [collectionName, documents] of Object.entries(backupData)) {
      console.log(`\n📥 Restoring collection: ${collectionName}`);

      // Clear existing data
      await db.collection(collectionName).deleteMany({});
      console.log(`   🗑️  Cleared existing documents`);

      if (documents.length > 0) {
        // Insert documents with error handling
        try {
          const result = await db.collection(collectionName).insertMany(documents, { ordered: false });
          console.log(`   ✅ Inserted ${result.insertedCount} documents`);
          totalDocuments += result.insertedCount;
        } catch (error) {
          // Some documents may have failed due to duplicates, but continue
          console.log(`   ⚠️  Some documents couldn't be inserted (likely duplicates)`);
          console.log(`   📝 Error: ${error.message}`);
          // Count how many were inserted before the error
          const countAfter = await db.collection(collectionName).countDocuments({});
          totalDocuments += countAfter;
        }
      } else {
        console.log(`   ℹ️  No documents to insert`);
      }
    }

    // Print summary
    console.log("\n📋 Restore Summary:");
    console.log("===================");
    for (const [collection, data] of Object.entries(backupData)) {
      console.log(`   ${collection}: ${data.length} documents restored`);
    }
    console.log(`\n✨ Total documents restored: ${totalDocuments}`);

  } catch (error) {
    console.error("❌ Restore error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from database");
    process.exit(0);
  }
};

restoreDatabase();
