import mongoose from "mongoose";

const appSettingsSchema = new mongoose.Schema(
  {
    schoolName: { type: String, default: "School Management System" },
    tagline: { type: String, default: "" },
    logo: { type: String, default: "" },
    favicon: { type: String, default: "" },
    pdfLogo: { type: String, default: "" },
    pdfHeaderText: { type: String, default: "" },
    pdfFooterText: { type: String, default: "" },
    pdfPrimaryColor: { type: String, default: "#1a73e8" },
    pdfFontFamily: { type: String, default: "Helvetica" },
    pdfPageSize: { type: String, default: "A4" },
    themeColor: { type: String, default: "#1a73e8" },
    accentColor: { type: String, default: "#f59e0b" },
    fontFamily: { type: String, default: "Inter" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    website: { type: String, default: "" },
    maintenanceMode: { type: Boolean, default: false },
    showAccountingBalancesToUsers: { type: Boolean, default: false },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

const AppSettings = mongoose.model("AppSettings", appSettingsSchema);
export default AppSettings;
