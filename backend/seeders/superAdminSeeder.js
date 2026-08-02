import dotenv from "dotenv";
import bcrypt from "bcrypt";
import connectDB from "../dbConnection/db.js";
import AppSettings from "../app/modules/appSettingsModule.js";
import Role from "../app/modules/roleModule.js";
import UserAuth from "../app/modules/userAuthModal.js";
import { normalizePermissions } from "../app/utils/rbac.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await connectDB();

    const targetEmail =
      process.env.SUPER_ADMIN_EMAIL || "superadmin@gmail.com";
    const targetPassword =
      process.env.SUPER_ADMIN_PASSWORD || "Admin@123";
    const hashed = await bcrypt.hash(targetPassword, 10);

    const existing = await UserAuth.findOne({ isSuperAdmin: true });
    if (!existing) {
      await UserAuth.create({
        name: "Super Admin",
        email: targetEmail,
        password: hashed,
        isSuperAdmin: true,
        isActive: true,
        failedLoginAttempts: 0,
      });
    } else {
      existing.email = existing.email || targetEmail;
      existing.password = hashed;
      existing.isSuperAdmin = true;
      existing.isActive = true;
      existing.failedLoginAttempts = 0;
      await existing.save();
    }

    const defaultRoles = [
      {
        name: "Super Admin",
        isSystem: true,
        description: "Protected system role for platform super administrators.",
        permissions: [
          { module: "dashboard", actions: { view: true, create: true, update: true, delete: true, import: true, export: true, print: true, approve: true } },
          { module: "courses", actions: { view: true, create: true, update: true, delete: true, import: true, export: true, print: true, approve: true } },
          { module: "employees", actions: { view: true, create: true, update: true, delete: true, import: true, export: true, print: true, approve: true } },
          { module: "students", actions: { view: true, create: true, update: true, delete: true, import: true, export: true, print: true, approve: true } },
          { module: "attendance", actions: { view: true, create: true, update: true, delete: true, import: true, export: true, print: true, approve: true } },
          { module: "accounting", actions: { view: true, create: true, update: true, delete: true, import: true, export: true, print: true, approve: true } },
          { module: "certifications", actions: { view: true, create: true, update: true, delete: true, import: true, export: true, print: true, approve: true } },
          { module: "announcements", actions: { view: true, create: true, update: true, delete: true, import: true, export: true, print: true, approve: true } },
        ],
      },
      {
        name: "Teacher",
        isSystem: true,
        permissions: [
          { module: "dashboard", actions: { view: true } },
          { module: "courses", actions: { view: true } },
          { module: "students", actions: { view: true } },
          { module: "attendance", actions: { view: true, create: true, update: true } },
        ],
      },
      {
        name: "Accountant",
        isSystem: true,
        permissions: [
          { module: "dashboard", actions: { view: true } },
          { module: "accounting", actions: { view: true, create: true, update: true, export: true, print: true } },
        ],
      },
      {
        name: "Student",
        isSystem: true,
        permissions: [
          { module: "dashboard", actions: { view: true } },
          { module: "courses", actions: { view: true } },
          { module: "certifications", actions: { view: true, print: true } },
          { module: "announcements", actions: { view: true } },
        ],
      },
    ];

    for (const roleData of defaultRoles) {
      const exists = await Role.findOne({ name: roleData.name });
      if (!exists) {
        await Role.create({
          ...roleData,
          permissions: normalizePermissions(roleData.permissions),
        });
      }
    }

    const existingSettings = await AppSettings.findOne();
    if (!existingSettings) {
      await AppSettings.create({ schoolName: "School Management System" });
    }

    console.log("Super admin + default roles + settings created.");
    console.log(`Login Email: ${targetEmail}`);
    console.log(`Login Password: ${targetPassword}`);
  } catch (error) {
    console.error("Seeder failed:", error.message);
  } finally {
    process.exit(0);
  }
};

createSuperAdmin();
