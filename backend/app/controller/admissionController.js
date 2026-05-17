// controllers/admissionController.js
import mongoose from "mongoose";
import AdmissionSchema from "../modules/AdmissionModule.js";
import EnrollmentSchema from "../modules/enrollmentModule.js";
import CourseSchema from "../modules/courseModule.js";
import BatchSchema from "../modules/batchModule.js";
import FeeStructureSchema from "../modules/feeStructureModule.js";
import * as XLSX from "xlsx";

const normalizeText = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const text = String(value).trim();
  return text === "" ? undefined : text;
};

const normalizeRegistrationNo = (value) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return undefined;
  }

  if (["null", "undefined", "n/a", "-"].includes(normalized.toLowerCase())) {
    return undefined;
  }

  return normalized;
};

const parseExcelDate = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return undefined;
    }

    return new Date(
      Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0),
    );
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return new Date(`${text}T00:00:00`);
  }

  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(text)) {
    const [day, month, year] = text.split(/[-/]/).map(Number);
    return new Date(year, month - 1, day);
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? undefined : fallback;
};

const normalizeBoolean = (value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["yes", "true", "1"].includes(normalized);
};

const normalizeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStatus = (value) => {
  const status = normalizeText(value);
  if (!status) return "Active";

  const lowered = status.toLowerCase();
  if (lowered === "active") return "Active";
  if (lowered === "completed") return "Completed";
  if (lowered === "dropped") return "Dropped";
  if (lowered === "on hold" || lowered === "onhold") return "On Hold";
  return "Active";
};

const getRowValue = (row, possibleKeys = []) => {
  for (const key of possibleKeys) {
    const match = Object.keys(row).find(
      (k) => k.toLowerCase().trim() === key.toLowerCase().trim(),
    );

    if (match && row[match] !== undefined && row[match] !== null && row[match] !== "") {
      return row[match];
    }
  }
  return null;
};

const resolveCourseFromRow = async (row) => {
  const rawCourseId = normalizeText(
    getRowValue(row, ["Course ID", "courseId", "CourseId"]),
  );
  const rawCourseName = normalizeText(
    getRowValue(row, ["Course Name", "courseName", "Course"]),
  );

  if (!rawCourseId && !rawCourseName) {
    return null;
  }

  let course = null;

  if (rawCourseId) {
    course = await CourseSchema.findOne({
      $or: [{ _id: rawCourseId }, { courseId: rawCourseId }],
    }).lean();
  }

  if (!course && rawCourseName) {
    const escaped = rawCourseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    course = await CourseSchema.findOne({
      courseName: { $regex: `^${escaped}$`, $options: "i" },
    }).lean();
  }

  return course;
};

const resolveBatchFromRow = async (row, courseId) => {
  if (!courseId) return null;

  const rawBatchCode = normalizeText(
    getRowValue(row, ["Batch Code", "batchCode", "BatchCode"]),
  );
  const rawBatchName = normalizeText(
    getRowValue(row, ["Batch Name", "batchName", "Batch"]),
  );

  if (!rawBatchCode && !rawBatchName) {
    return null;
  }

  const query = { course: courseId };

  if (rawBatchCode) {
    const byCode = await BatchSchema.findOne({ ...query, batchCode: rawBatchCode }).lean();
    if (byCode) return byCode;
  }

  if (rawBatchName) {
    const escaped = rawBatchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const byName = await BatchSchema.findOne({
      ...query,
      batchName: { $regex: `^${escaped}$`, $options: "i" },
    }).lean();
    if (byName) return byName;
  }

  return null;
};

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

    const normalizedIds = ids
      .map((id) => (typeof id === "string" ? id.trim() : String(id || "").trim()))
      .filter(Boolean);

    const validObjectIds = normalizedIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (validObjectIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid student IDs were provided",
      });
    }

    const result = await AdmissionSchema.deleteMany({
      _id: { $in: validObjectIds },
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found for the selected records",
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
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const studentsData = XLSX.utils.sheet_to_json(worksheet, {
      defval: null,
      raw: false,
    });

    if (!studentsData || studentsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data found in the file",
      });
    }

    const results = {
      imported: 0,
      updated: 0,
      coursesAssigned: 0,
      courseSkipped: 0,
      skipped: 0,
      errors: [],
    };
    const seenCnicOrBForms = new Set();
    const seenRegistrationNos = new Set();

    // Process each student
    for (const [index, row] of studentsData.entries()) {
      try {
        // Map Excel columns to schema fields (case-insensitive)
        const studentData = {};

        // Map fields
        studentData.studentName = normalizeText(
          getRowValue(row, ["Student Name", "studentName", "Name", "name"]),
        );
        studentData.registrationNo = normalizeRegistrationNo(
          getRowValue(row, ["Registration No", "registrationNo", "Reg No"]),
        );
        studentData.registrationDate = parseExcelDate(
          getRowValue(row, ["Registration Date", "registrationDate", "Reg Date"]),
        );
        studentData.gender = normalizeText(getRowValue(row, ["Gender", "gender"]));
        studentData.dateOfBirth = parseExcelDate(
          getRowValue(row, ["Date of Birth", "dateOfBirth", "DOB", "dob"]),
        );
        studentData.religion = normalizeText(getRowValue(row, ["Religion", "religion"]));
        studentData.cnicOrBForm = normalizeText(
          getRowValue(row, ["CNIC/B-Form", "cnicOrBForm", "CNIC", "BForm", "cnic"]),
        );
        studentData.caste = normalizeText(getRowValue(row, ["Caste", "caste"]));
        studentData.mobileNumber = normalizeText(
          getRowValue(row, ["Mobile Number", "mobileNumber", "Mobile", "Phone"]),
        );
        studentData.disability = normalizeBoolean(getRowValue(row, ["Disability", "disability"]));
        studentData.previousSchoolCollege = normalizeText(
          getRowValue(row, ["Previous School/College", "previousSchoolCollege", "Previous School"]),
        );
        studentData.lastClassAttended = normalizeText(
          getRowValue(row, ["Last Class Attended", "lastClassAttended", "Last Class"]),
        );
        studentData.emergencyContactNumber = normalizeText(
          getRowValue(row, ["Emergency Contact", "emergencyContactNumber", "Emergency Contact No"]),
        );
        studentData.permanentAddress = normalizeText(
          getRowValue(row, ["Permanent Address", "permanentAddress", "Address"]),
        );
        studentData.fatherName = normalizeText(
          getRowValue(row, ["Father Name", "fatherName", "Father's Name"]),
        );
        studentData.fatherCnic = normalizeText(
          getRowValue(row, ["Father CNIC", "fatherCnic", "Father's CNIC"]),
        );
        studentData.fatherOccupation = normalizeText(
          getRowValue(row, ["Father Occupation", "fatherOccupation", "Father's Occupation"]),
        );
        studentData.fatherContact = normalizeText(
          getRowValue(row, ["Father Contact", "fatherContact", "Father's Contact"]),
        );
        studentData.motherName = normalizeText(
          getRowValue(row, ["Mother Name", "motherName", "Mother's Name"]),
        );
        studentData.guardianName = normalizeText(
          getRowValue(row, ["Guardian Name", "guardianName", "Guardian's Name"]),
        );
        studentData.guardianContact = normalizeText(
          getRowValue(row, ["Guardian Contact", "guardianContact", "Guardian's Contact"]),
        );
        studentData.whatsappNumber = normalizeText(
          getRowValue(row, ["WhatsApp Number", "whatsappNumber", "WhatsApp", "Whatsapp"]),
        );
        studentData.emailAddress = normalizeText(
          getRowValue(row, ["Email", "emailAddress", "Email Address", "E-mail"]),
        );
        studentData.currentAddress = normalizeText(
          getRowValue(row, ["Current Address", "currentAddress"]),
        );
        studentData.unionCouncil = normalizeText(
          getRowValue(row, ["Union Council", "unionCouncil"]),
        );
        studentData.tehsil = normalizeText(getRowValue(row, ["Tehsil", "tehsil"]));
        studentData.district = normalizeText(getRowValue(row, ["District", "district"]));
        studentData.reference = normalizeText(getRowValue(row, ["Reference", "reference"]));

        // Validate required fields
        if (
          !studentData.studentName ||
          !studentData.mobileNumber ||
          !studentData.gender ||
          !studentData.dateOfBirth ||
          !studentData.religion ||
          !studentData.cnicOrBForm ||
          !studentData.fatherName ||
          !studentData.fatherCnic ||
          !studentData.permanentAddress ||
          !studentData.emergencyContactNumber ||
          !studentData.registrationDate
        ) {
          results.errors.push({
            row: index + 2,
            error:
              "Missing required fields. Required: Student Name, Mobile Number, Gender, Date of Birth, Religion, CNIC/B-Form, Father Name, Father CNIC, Permanent Address, Emergency Contact, Registration Date",
          });
          continue;
        }

        if (!["Male", "Female"].includes(studentData.gender)) {
          results.errors.push({
            row: index + 2,
            error: `Invalid gender value: ${studentData.gender}`,
          });
          continue;
        }

        if (!["Muslim", "Non-Muslim"].includes(studentData.religion)) {
          results.errors.push({
            row: index + 2,
            error: `Invalid religion value: ${studentData.religion}`,
          });
          continue;
        }

        // Enforce unique Registration No when provided
        if (studentData.registrationNo) {
          if (seenRegistrationNos.has(studentData.registrationNo)) {
            results.skipped++;
            results.errors.push({
              row: index + 2,
              error: `Duplicate Registration No in file: ${studentData.registrationNo}`,
            });
            continue;
          }

          const existingByRegistrationNo = await AdmissionSchema.findOne({
            registrationNo: studentData.registrationNo,
          });

          if (existingByRegistrationNo) {
            results.skipped++;
            results.errors.push({
              row: index + 2,
              error: `Registration No already exists in database: ${studentData.registrationNo}`,
            });
            continue;
          }

          seenRegistrationNos.add(studentData.registrationNo);
        } else {
          delete studentData.registrationNo;
        }

        // Enforce unique CNIC/B-Form (skip duplicates, do not update)
        let existingByCnic = null;
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

        seenCnicOrBForms.add(studentData.cnicOrBForm);

        const newStudent = new AdmissionSchema(studentData);
        const savedStudent = await newStudent.save();

        // Optional: assign course and batch from the same import row
        const course = await resolveCourseFromRow(row);
        if (course) {
          const batch = await resolveBatchFromRow(row, course._id);
          const enrollmentDate =
            parseExcelDate(
              getRowValue(row, [
                "Enrollment Date",
                "enrollmentDate",
                "Course Enrollment Date",
              ]),
            ) || studentData.registrationDate || new Date();

          const existingEnrollment = await EnrollmentSchema.findOne({
            student: savedStudent._id,
            course: course._id,
          }).lean();

          if (existingEnrollment) {
            results.courseSkipped += 1;
          } else {
            if (batch && batch.currentStudents >= batch.maxStudents) {
              results.courseSkipped += 1;
              results.errors.push({
                row: index + 2,
                error: `Batch is full for course ${course.courseName} (${batch.batchName})`,
              });
            } else {
              const enrollment = await new EnrollmentSchema({
                student: savedStudent._id,
                course: course._id,
                batch: batch?._id || null,
                enrollmentDate,
                status: normalizeStatus(getRowValue(row, ["Enrollment Status", "status"])),
                notes: normalizeText(getRowValue(row, ["Enrollment Notes", "notes"])),
              }).save();

              if (batch) {
                await BatchSchema.findByIdAndUpdate(batch._id, {
                  $inc: { currentStudents: 1 },
                });
              }

              const admissionFee = normalizeNumber(
                getRowValue(row, ["Admission Fee", "admissionFee"]),
                course.admissionFee || 0,
              );
              const courseFee = normalizeNumber(
                getRowValue(row, ["Course Fee", "courseFee"]),
                course.courseFee || 0,
              );
              const certificateFee = normalizeNumber(
                getRowValue(row, ["Certificate Fee", "certificateFee"]),
                course.certificateFee || 0,
              );
              const examFee = normalizeNumber(
                getRowValue(row, ["Exam Fee", "examFee"]),
                course.examFee || 0,
              );
              const registrationFee = normalizeNumber(
                getRowValue(row, ["Registration Fee", "registrationFee"]),
                course.registrationFee || 0,
              );
              const practicalFee = normalizeNumber(
                getRowValue(row, ["Practical Fee", "practicalFee"]),
                course.practicalFee || 0,
              );
              const otherFee = normalizeNumber(
                getRowValue(row, ["Other Fee", "otherFee"]),
                course.otherFee || 0,
              );
              const discount = Math.max(
                0,
                normalizeNumber(getRowValue(row, ["Discount", "discount"]), 0),
              );
              const totalFee = Math.max(
                0,
                admissionFee +
                  courseFee +
                  certificateFee +
                  examFee +
                  registrationFee +
                  practicalFee +
                  otherFee -
                  discount,
              );

              const paidAmount = Math.max(
                0,
                normalizeNumber(getRowValue(row, ["Paid Amount", "paidAmount"]), 0),
              );
              const dueDate =
                parseExcelDate(getRowValue(row, ["Due Date", "dueDate"])) || enrollmentDate;

              await new FeeStructureSchema({
                student: savedStudent._id,
                course: course._id,
                enrollment: enrollment._id,
                admissionFee,
                courseFee,
                certificateFee,
                examFee,
                registrationFee,
                practicalFee,
                otherFee,
                discount,
                discountPercentage: 0,
                paymentPlanType: "full_payment",
                discountOnAdmission: 0,
                discountOnCourseFee: discount,
                discountType: discount > 0 ? "courseFee" : "none",
                totalFee,
                paidAmount,
                remainingAmount: Math.max(0, totalFee - paidAmount),
                installmentEnabled: false,
                numberOfInstallments: 1,
                installmentAmount: totalFee,
                installments: [
                  {
                    installmentNumber: 1,
                    description: "Full Payment",
                    feeComponents: {
                      admissionFee,
                      courseFee,
                      certificateFee,
                      examFee,
                      registrationFee,
                      practicalFee,
                      otherFee,
                    },
                    amount: totalFee,
                    dueDate,
                    status: paidAmount >= totalFee ? "Paid" : "Pending",
                    paidAmount,
                    paidDate: paidAmount > 0 ? new Date() : null,
                  },
                ],
                feeStatus:
                  paidAmount <= 0
                    ? "Unpaid"
                    : paidAmount >= totalFee
                      ? "Paid"
                      : "Partial",
                notes: normalizeText(getRowValue(row, ["Fee Notes", "feeNotes"])),
                systemGrantedNumber: savedStudent.registrationNo || null,
              }).save();

              await AdmissionSchema.findByIdAndUpdate(savedStudent._id, {
                $addToSet: { enrolledCourses: course._id },
              });

              results.coursesAssigned += 1;
            }
          }
        }

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
      message: `Bulk import completed: ${results.imported} imported, ${results.coursesAssigned} course assignment(s), ${results.skipped} skipped`,
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
    res.status(200).json({
      success: true,
      message:
        "Registration number auto-refresh is disabled. Registration numbers are now only saved from student/import data.",
      data: {
        updatedCount: 0,
        clearedCount: 0,
      },
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
