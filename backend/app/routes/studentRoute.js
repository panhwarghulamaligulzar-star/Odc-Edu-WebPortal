import express from "express";
import studentController from "../controller/studentController.js";
import {
  getAllAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  bulkDeleteAdmissions,
  bulkImportStudents,
  refreshItRegistrationNumbers,
} from "../controller/admissionController.js";
import multer from "multer";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";
const storage = multer.memoryStorage();
const upload = multer({ storage });

const studentRoute = express.Router();
// Create single certificate with image upload
studentRoute.post(
  "/certificates",
  authMiddleware,
  authorize("certifications", "create"),
  upload.none(),
  studentController.createStudentCertificate,
);
// NEW: Bulk upload certificates from Excel (JSON data)
studentRoute.post("/bulk-upload", authMiddleware, authorize("certifications", "import"), studentController.bulkUploadCertifications);
// Get all certificates
studentRoute.get("/certificates", authMiddleware, authorize("certifications", "view"), studentController.getAllCertificates);
// Get certificate(s) by student ID
studentRoute.get("/certificate/:id", authMiddleware, authorize("certifications", "view"), studentController.getCertificates);
// Update certificate with image upload
studentRoute.put(
  "/certificate/:id",
  authMiddleware,
  authorize("certifications", "update"),
  upload.none(),
  studentController.updateCertificate,
);
// Delete certificate
studentRoute.delete("/certificate/:id", authMiddleware, authorize("certifications", "delete"), studentController.deleteCertificate);

// Get all admissions/students
studentRoute.get("/admissions", authMiddleware, authorize("students", "view"), getAllAdmissions);
// Get admission by ID
studentRoute.get("/admission/:id", authMiddleware, authorize("students", "view"), getAdmissionById);
// Create admission/student with profile picture
studentRoute.post(
  "/admission",
  authMiddleware,
  authorize("students", "create"),
  upload.single("profilePicture"),
  createAdmission,
);
// Update admission/student with profile picture
studentRoute.put(
  "/admission/:id",
  authMiddleware,
  authorize("students", "update"),
  upload.single("profilePicture"),
  updateAdmission,
);
// Delete admission/student
studentRoute.delete("/admission/:id", authMiddleware, authorize("students", "delete"), deleteAdmission);
// Bulk delete admissions/students
studentRoute.post("/admissions/bulk-delete", authMiddleware, authorize("students", "delete"), bulkDeleteAdmissions);

// Bulk import students from CSV/Excel
studentRoute.post("/students/bulk-import", authMiddleware, authorize("students", "import"), upload.single("file"), bulkImportStudents);
studentRoute.post("/admissions/refresh-it-registration-nos", authMiddleware, authorize("students", "update"), refreshItRegistrationNumbers);

export default studentRoute;
