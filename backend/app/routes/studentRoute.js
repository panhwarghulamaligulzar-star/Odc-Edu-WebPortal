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
const storage = multer.memoryStorage();
const upload = multer({ storage });

const studentRoute = express.Router();
// Create single certificate with image upload
studentRoute.post(
  "/certificates",
  upload.none(),
  studentController.createStudentCertificate,
);
// NEW: Bulk upload certificates from Excel (JSON data)
studentRoute.post("/bulk-upload", studentController.bulkUploadCertifications);
// Get all certificates
studentRoute.get("/certificates", studentController.getAllCertificates);
// Get certificate(s) by student ID
studentRoute.get("/certificate/:id", studentController.getCertificates);
// Update certificate with image upload
studentRoute.put(
  "/certificate/:id",
  upload.none(),
  studentController.updateCertificate,
);
// Delete certificate
studentRoute.delete("/certificate/:id", studentController.deleteCertificate);

// Get all admissions/students
studentRoute.get("/admissions", getAllAdmissions);
// Get admission by ID
studentRoute.get("/admission/:id", getAdmissionById);
// Create admission/student with profile picture
studentRoute.post(
  "/admission",
  upload.single("profilePicture"),
  createAdmission,
);
// Update admission/student with profile picture
studentRoute.put(
  "/admission/:id",
  upload.single("profilePicture"),
  updateAdmission,
);
// Delete admission/student
studentRoute.delete("/admission/:id", deleteAdmission);
// Bulk delete admissions/students
studentRoute.post("/admissions/bulk-delete", bulkDeleteAdmissions);

// Bulk import students from CSV/Excel
studentRoute.post("/students/bulk-import", upload.single("file"), bulkImportStudents);
studentRoute.post("/admissions/refresh-it-registration-nos", refreshItRegistrationNumbers);

export default studentRoute;
