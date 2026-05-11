import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "../dbConnection/db.js";
import UserAuth from "../app/modules/userAuthModal.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    console.log("🔍 Starting admin seeder...");

    // Connect to database
    console.log("📡 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected successfully!");

    // Check if admin already exists
    console.log("🔎 Checking for existing admin user...");
    const existingAdmin = await UserAuth.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("⚠️  Admin user already exists:", existingAdmin.email);
      console.log("📋 Admin Details:");
      console.log("   Email:", existingAdmin.email);
      console.log("   Name:", existingAdmin.name);
      console.log("   Role:", existingAdmin.role);
    } else {
      console.log("✨ No admin found, creating new one...");

      // Hash password
      const saltRounds = 10;
      const testPassword = "admin123";
      console.log(`🔐 Hashing password with salt rounds: ${saltRounds}`);
      const hashedPassword = await bcrypt.hash(testPassword, saltRounds);
      console.log("✅ Password hashed successfully!");

      // Create admin user
      console.log("👤 Creating admin user...");
      const adminUser = new UserAuth({
        name: "Ali Admin",
        email: "ali1@gmail.com",
        role: "admin",
        password: hashedPassword,
      });

      console.log("💾 Saving user to database...");
      await adminUser.save();
      console.log("✅ Default admin user created successfully!");
      console.log("\n📋 Admin Credentials:");
      console.log("   Email: ali1@gmail.com");
      console.log("   Password: admin123");
      console.log("   Role: admin\n");
    }
  } catch (error) {
    console.error("❌ Error seeding admin:", error.message);
    console.error("📍 Error details:", error);
  } finally {
    process.exit(0);
  }
};

seedAdmin();
