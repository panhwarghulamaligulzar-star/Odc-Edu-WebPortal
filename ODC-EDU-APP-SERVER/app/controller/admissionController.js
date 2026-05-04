// controllers/admissionController.js
import AdmissionSchema from "../modules/AdmissionModule.js";
import * as XLSX from "xlsx";
import { resyncItRegistrationNumbers } from "../utils/registrationNumberSync.js";

// Create new admission/student
export const createAdmission = async (req, res) => {
  try {
    const studentData = { ...req.body };
    delete studentData.registrationNo;

    // Handle profile picture if uploaded
    if (req.file) {
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      studentData.profilePicture = base64Image;
    }

    const newStudent = new AdmissionSchema(studentData);
    const savedStudent = await newStudent.save();

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: savedStudent,
    });
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating student",
      error: error.message,
    });
  }
};

// Update admission/student
export const updateAdmission = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData.registrationNo;

    // Handle profile picture if uploaded
    if (req.file) {
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      updateData.profilePicture = base64Image;
    }

    const updatedStudent = await AdmissionSchema.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating student",
      error: error.message,
    });
  }
};

// Delete admission/student
export const deleteAdmission = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedStudent = await AdmissionSchema.findByIdAndDelete(id);

    if (!deletedStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting student",
      error: error.message,
    });
  }
};

// Bulk delete admissions/students in a single query
export const bulkDeleteAdmissions = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Student IDs are required",
      });
    }

    const result = await AdmissionSchema.deleteMany({
      _id: { $in: ids },
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found for provided IDs",
      });
    }

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} student(s) deleted successfully`,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    console.error("Error bulk deleting students:", error);
    res.status(500).json({
      success: false,
      message: "Server error while bulk deleting students",
      error: error.message,
    });
  }
};

// Get all admissions/students
export const getAllAdmissions = async (req, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { studentName: { $regex: search, $options: "i" } },
        { registrationNo: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const students = await AdmissionSchema.find(filter)
      .populate("course", "courseName courseId")
      .populate("enrolledCourses", "courseName courseId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdmissionSchema.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Students retrieved successfully",
      data: students,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error retrieving students:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving students",
      error: error.message,
    });
  }
};

// Get admission by ID
export const getAdmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await AdmissionSchema.findById(id)
      .populate("course", "courseName courseId")
      .populate("enrolledCourses", "courseName courseId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Student retrieved successfully",
      data: student,
    });
  } catch (error) {
    console.error("Error retrieving student:", error);
    res.status(500).json({
      success: false,
      message: "Server error while retrieving student",
      error: error.message,
    });
  }
};

// Bulk import students from CSV/Excel
export const bulkImportStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Parse the Excel/CSV file
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const studentsData = XLSX.utils.sheet_to_json(worksheet);

    if (!studentsData || studentsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data found in the file",
      });
    }

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
    const seenCnicOrBForms = new Set();

    // Process each student
    for (const [index, row] of studentsData.entries()) {
      try {
        // Map Excel columns to schema fields (case-insensitive)
        const studentData = {};
        
        // Helper to find matching key (case-insensitive)
        const getValue = (possibleKeys) => {
          for (const key of possibleKeys) {
            const match = Object.keys(row).find(
              (k) => k.toLowerCase().trim() === key.toLowerCase().trim()
            );
            if (match && row[match] !== undefined && row[match] !== null && row[match] !== "") {
              return row[match];
            }
          }
          return null;
        };

        // Map fields
        studentData.studentName = getValue(["Student Name", "studentName", "Name", "name"]);
        delete studentData.registrationNo;
        studentData.registrationDate = getValue(["Registration Date", "registrationDate", "Reg Date"]);
        studentData.gender = getValue(["Gender", "gender"]);
        studentData.dateOfBirth = getValue(["Date of Birth", "dateOfBirth", "DOB", "dob"]);
        studentData.religion = getValue(["Religion", "religion"]);
        studentData.cnicOrBForm = getValue(["CNIC/B-Form", "cnicOrBForm", "CNIC", "BForm", "cnic"]);
        studentData.caste = getValue(["Caste", "caste"]);
        studentData.mobileNumber = getValue(["Mobile Number", "mobileNumber", "Mobile", "Phone"]);
        studentData.disability = getValue(["Disability", "disability"]);
        studentData.previousSchoolCollege = getValue(["Previous School/College", "previousSchoolCollege", "Previous School"]);
        studentData.lastClassAttended = getValue(["Last Class Attended", "lastClassAttended", "Last Class"]);
        studentData.emergencyContactNumber = getValue(["Emergency Contact", "emergencyContactNumber", "Emergency Contact No"]);
        studentData.permanentAddress = getValue(["Permanent Address", "permanentAddress", "Address"]);
        studentData.fatherName = getValue(["Father Name", "fatherName", "Father's Name"]);
        studentData.fatherCnic = getValue(["Father CNIC", "fatherCnic", "Father's CNIC"]);
        studentData.fatherOccupation = getValue(["Father Occupation", "fatherOccupation", "Father's Occupation"]);
        studentData.fatherContact = getValue(["Father Contact", "fatherContact", "Father's Contact"]);
        studentData.motherName = getValue(["Mother Name", "motherName", "Mother's Name"]);
        studentData.guardianName = getValue(["Guardian Name", "guardianName", "Guardian's Name"]);
        studentData.guardianContact = getValue(["Guardian Contact", "guardianContact", "Guardian's Contact"]);
        studentData.whatsappNumber = getValue(["WhatsApp Number", "whatsappNumber", "WhatsApp", "Whatsapp"]);
        studentData.emailAddress = getValue(["Email", "emailAddress", "Email Address", "E-mail"]);
        studentData.currentAddress = getValue(["Current Address", "currentAddress"]);
        studentData.unionCouncil = getValue(["Union Council", "unionCouncil"]);
        studentData.tehsil = getValue(["Tehsil", "tehsil"]);
        studentData.district = getValue(["District", "district"]);
        studentData.reference = getValue(["Reference", "reference"]);

        // Normalize identifiers
        if (studentData.cnicOrBForm) {
          studentData.cnicOrBForm = String(studentData.cnicOrBForm).trim();
        }
        if (studentData.mobileNumber) {
          studentData.mobileNumber = String(studentData.mobileNumber).trim();
        }
        
        // Validate required fields
        if (!studentData.studentName || !studentData.mobileNumber) {
          results.errors.push({
            row: index + 2,
            error: "Missing required fields (Student Name, Mobile Number)",
          });
          continue;
        }

        // Handle disability as boolean
        if (studentData.disability !== undefined && studentData.disability !== null) {
          if (typeof studentData.disability === "string") {
            studentData.disability = studentData.disability.toLowerCase() === "yes" || studentData.disability === "true";
          }
        }

        // Handle dates
        if (studentData.registrationDate && typeof studentData.registrationDate === "number") {
          // Excel serial date
          studentData.registrationDate = new Date(Math.round((studentData.registrationDate - 25569) * 86400 * 1000));
        }
        if (studentData.dateOfBirth && typeof studentData.dateOfBirth === "number") {
          studentData.dateOfBirth = new Date(Math.round((studentData.dateOfBirth - 25569) * 86400 * 1000));
        }

        // Enforce unique CNIC/B-Form (skip duplicates, do not update)
        let existingByCnic = null;
        if (studentData.cnicOrBForm) {
          if (seenCnicOrBForms.has(studentData.cnicOrBForm)) {
            results.skipped++;
            results.errors.push({
              row: index + 2,
              error: `Duplicate CNIC/B-Form in file: ${studentData.cnicOrBForm}`,
            });
            continue;
          }
          existingByCnic = await AdmissionSchema.findOne({
            cnicOrBForm: studentData.cnicOrBForm,
          });
          if (existingByCnic) {
            results.skipped++;
            results.errors.push({
              row: index + 2,
              error: `CNIC/B-Form already exists in database: ${studentData.cnicOrBForm}`,
            });
            continue;
          }
        }

        if (studentData.cnicOrBForm) {
          seenCnicOrBForms.add(studentData.cnicOrBForm);
        }

        const newStudent = new AdmissionSchema(studentData);
        await newStudent.save();
        results.imported++;
      } catch (err) {
        results.errors.push({
          row: index + 2,
          error: err.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk import completed: ${results.imported} imported, ${results.skipped} skipped`,
      data: results,
    });
  } catch (error) {
    console.error("Error importing students:", error);
    res.status(500).json({
      success: false,
      message: "Server error while importing students",
      error: error.message,
    });
  }
};

export const refreshItRegistrationNumbers = async (req, res) => {
  try {
    const result = await resyncItRegistrationNumbers();

    res.status(200).json({
      success: true,
      message: `IT registration numbers refreshed. ${result.itStudents} IT student(s) sequenced and ${result.clearedCount} non-IT registration number(s) cleared.`,
      data: result,
    });
  } catch (error) {
    console.error("Error refreshing IT registration numbers:", error);
    res.status(500).json({
      success: false,
      message: "Server error while refreshing IT registration numbers",
      error: error.message,
    });
  }
};

export default {
  getAllAdmissions,
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  bulkDeleteAdmissions,
  bulkImportStudents,
  refreshItRegistrationNumbers,
};
