// seeders/accountingSeeder.js
// Run this once: node seeders/accountingSeeder.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../dbConnection/db.js";
import AccountingType from "../app/modules/accountingTypeModule.js";
import HeadOfAccount from "../app/modules/headOfAccountModule.js";
import PaymentMethod from "../app/modules/paymentMethodModule.js";

dotenv.config();

const seed = async () => {
  await connectDB();

  // ── Seed Accounting Types ──────────────────────────────────
  const types = [
    { name: "Income", description: "All money received by the organisation" },
    { name: "Expense", description: "All money spent by the organisation" },
  ];

  let incomeType, expenseType;

  for (const t of types) {
    const existing = await AccountingType.findOne({ name: t.name });
    if (!existing) {
      const created = await AccountingType.create(t);
      console.log(`✅ Created accounting type: ${created.name}`);
      if (t.name === "Income") incomeType = created;
      else expenseType = created;
    } else {
      console.log(`ℹ️  Accounting type already exists: ${existing.name}`);
      if (existing.name === "Income") incomeType = existing;
      else expenseType = existing;
    }
  }

  // ── Seed Default Heads of Account ─────────────────────────
  const defaultHeads = [
    // Income heads
    {
      name: "Tuition Fee",
      type: incomeType._id,
      description: "Student course / tuition fee income",
    },
    {
      name: "Admission Fee",
      type: incomeType._id,
      description: "Student admission fee income",
    },
    {
      name: "Certificate Fee",
      type: incomeType._id,
      description: "Certificate issuance fee income",
    },
    {
      name: "Donation",
      type: incomeType._id,
      description: "Donations and grants received",
    },
    {
      name: "Other Income",
      type: incomeType._id,
      description: "Miscellaneous income",
    },
    // Expense heads
    {
      name: "Salary",
      type: expenseType._id,
      description: "Staff and teacher salaries",
    },
    {
      name: "Rent",
      type: expenseType._id,
      description: "Office / institute rent",
    },
    {
      name: "Utilities",
      type: expenseType._id,
      description: "Electricity, gas, internet bills",
    },
    {
      name: "Stationery",
      type: expenseType._id,
      description: "Office and classroom stationery",
    },
    {
      name: "Maintenance",
      type: expenseType._id,
      description: "Building and equipment maintenance",
    },
    {
      name: "Other Expense",
      type: expenseType._id,
      description: "Miscellaneous expenses",
    },
  ];

  for (const h of defaultHeads) {
    const existing = await HeadOfAccount.findOne({
      name: h.name,
      type: h.type,
    });
    if (!existing) {
      await HeadOfAccount.create(h);
      console.log(`✅ Created head of account: ${h.name}`);
    } else {
      console.log(`ℹ️  Head already exists: ${h.name}`);
    }
  }

  // ── Seed Cash Payment Method ───────────────────────────
  const cashExists = await PaymentMethod.findOne({ isDefault: true });
  if (!cashExists) {
    await PaymentMethod.create({
      name: "Cash",
      type: "cash",
      openingBalance: 0,
      currentBalance: 0,
      isDefault: true,
      isActive: true,
    });
    console.log("✅ Created payment method: Cash");
  } else {
    console.log("ℹ️  Cash payment method already exists");
  }

  console.log("\n🎉 Accounting seeder completed successfully");
  mongoose.connection.close();
};

seed().catch((err) => {
  console.error("Seeder failed:", err);
  mongoose.connection.close();
  process.exit(1);
});
