import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "../dbConnection/db.js";
import UserAuth from "../app/modules/userAuthModal.js";

dotenv.config();

const createAliAdmin = async () => {
  try {
    console.log("🔍 Starting Ali admin seeder...");

    // Connect to database
    console.log("📡 Connecting to database...");
    await connectDB();
    console.log("✅ Database connected successfully!");

    // Check if user already exists
    const email = "ali1@gmail.com";
    console.log(`🔎 Checking if user ${email} already exists...`);
    const existingUser = await UserAuth.findOne({ email });

    if (existingUser) {
      console.log("⚠️  User already exists!");
      console.log("📋 User Details:");
      console.log("   Email:", existingUser.email);
      console.log("   Name:", existingUser.name);
      console.log("   Role:", existingUser.role);
      console.log("   ID:", existingUser._id);
    } else {
      console.log("✨ User not found, creating new admin...");

      // Hash password
      const saltRounds = 10;
      const password = "admin123";
      console.log(`🔐 Hashing password with salt rounds: ${saltRounds}`);
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log("✅ Password hashed successfully!");

      // Create admin user
      console.log("👤 Creating admin user...");
      const newUser = new UserAuth({
        name: "Ali Admin",
        email: "ali1@gmail.com",
        role: "admin",
        password: hashedPassword,
      });

      console.log("💾 Saving user to database...");
      await newUser.save();
      console.log("✅ Admin user created successfully!");
      console.log("\n📋 Admin Credentials:");
      console.log("   Email: ali1@gmail.com");
      console.log("   Password: admin123");
      console.log("   Name: Ali Admin");
      console.log("   Role: admin");
      console.log("   ID:", newUser._id);
      console.log("\n🎉 User is ready to login!\n");
    }
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    console.error("📍 Error details:", error);
  } finally {
    process.exit(0);
  }
};

createAliAdmin();
