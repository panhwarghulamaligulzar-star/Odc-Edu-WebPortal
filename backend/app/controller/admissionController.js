// controllers/admissionController.js
import mongoose from "mongoose";
import AdmissionSchema from "../modules/AdmissionModule.js";
import EnrollmentSchema from "../modules/enrollmentModule.js";
import CourseSchema from "../modules/courseModule.js";
import BatchSchema from "../modules/batchModule.js";
import FeeStructureSchema from "../modules/feeStructureModule.js";
import FeePaymentSchema from "../modules/feePaymentModule.js";
import * as XLSX from "xlsx";
import {
  calculateInstallmentPlan,
  generateReceiptNumber,
} from "../utils/installmentCalculator.js";
import { createAutoAccountingEntry } from "../utils/autoAccountingEntry.js";

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

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;
const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || min));

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

const normalizeInstallmentStatus = (value) => {
  const status = normalizeText(value);
  if (!status) return "Pending";

  const lowered = status.toLowerCase();
  if (lowered === "paid") return "Paid";
  if (lowered === "partial") return "Partial";
  if (lowered === "overdue") return "Overdue";
  return "Pending";
};

const normalizeFeeStatus = (value) => {
  const status = normalizeText(value);
  if (!status) return "Unpaid";

  const lowered = status.toLowerCase();
  if (lowered === "paid") return "Paid";
  if (lowered === "partial") return "Partial";
  if (lowered === "overdue") return "Overdue";
  return "Unpaid";
};

const normalizePaymentPlanType = (value) => {
  const plan = normalizeText(value);
  if (!plan) return "custom";

  const lowered = plan.toLowerCase();
  if (lowered === "full" || lowered === "full payment" || lowered === "full_payment") {
    return "full_payment";
  }
  if (
    lowered === "three installments" ||
    lowered === "three_installments" ||
    lowered === "three-installments"
  ) {
    return "three_installments";
  }
  if (lowered === "monthly") {
    return "monthly";
  }
  return "custom";
};

const normalizePaymentType = (value, hasInstallment = false) => {
  const paymentType = normalizeText(value);
  if (!paymentType) {
    return hasInstallment ? "Installment" : "Partial";
  }

  const lowered = paymentType.toLowerCase();
  if (lowered === "full") return "Full";
  if (lowered === "partial") return "Partial";
  if (lowered === "installment") return "Installment";
  return hasInstallment ? "Installment" : "Partial";
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

const getSheetRowsByNames = (workbook, names = []) => {
  const sheetName = workbook.SheetNames.find((name) =>
    names.some((candidate) => candidate.toLowerCase() === name.trim().toLowerCase()),
  );

  if (!sheetName) {
    return null;
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: null,
    raw: false,
  });
};

const getStudentIdentifiersFromRow = (row = {}) => ({
  registrationNo: normalizeRegistrationNo(
    getRowValue(row, [
      "Registration No",
      "registrationNo",
      "Student Registration No",
      "Student Reg No",
      "Reg No",
    ]),
  ),
  cnicOrBForm: normalizeText(
    getRowValue(row, [
      "CNIC/B-Form",
      "cnicOrBForm",
      "Student CNIC/B-Form",
      "Student CNIC",
      "CNIC",
      "BForm",
      "cnic",
    ]),
  ),
});

const buildStudentLookupKey = ({ registrationNo, cnicOrBForm }) => {
  if (registrationNo) return `reg:${registrationNo}`;
  if (cnicOrBForm) return `cnic:${cnicOrBForm}`;
  return null;
};

const buildEnrollmentLookupKey = (row = {}, course = null) => {
  const identifiers = getStudentIdentifiersFromRow(row);
  const studentKey = buildStudentLookupKey(identifiers);
  const courseIdentifier =
    normalizeText(getRowValue(row, ["Course ID", "courseId", "CourseId"])) ||
    normalizeText(getRowValue(row, ["Course Name", "courseName", "Course"])) ||
    course?._id?.toString() ||
    course?.courseId ||
    course?.courseName;

  if (!studentKey || !courseIdentifier) {
    return null;
  }

  return `${studentKey}|course:${String(courseIdentifier).trim().toLowerCase()}`;
};

const addMonths = (dateValue, monthsToAdd) => {
  const date = new Date(dateValue);
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
};

const normalizeAdditionalFees = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const amount = round2(
        getRowValue(row, ["Amount", "amount", "Fee Amount"]) ?? row?.amount,
      );
      const feeTypeRaw = normalizeText(
        getRowValue(row, ["Fee Type", "feeType", "Type"]) ?? row?.feeType,
      );
      const feeType = ["exam", "registration", "practical", "other"].includes(
        String(feeTypeRaw || "").toLowerCase(),
      )
        ? String(feeTypeRaw).toLowerCase()
        : "other";
      const title =
        normalizeText(getRowValue(row, ["Title", "title", "Fee Title"])) ||
        row?.title ||
        "Additional Fee";
      const paymentModeRaw =
        normalizeText(
          getRowValue(row, ["Payment Mode", "paymentMode", "Mode"]),
        ) || row?.paymentMode;
      const paymentMode =
        String(paymentModeRaw || "").toLowerCase() === "two_installments"
          ? "two_installments"
          : "one_time";

      return {
        feeType,
        title,
        amount,
        paymentMode,
        numberOfInstallments: paymentMode === "two_installments" ? 2 : 1,
      };
    })
    .filter((row) => row.amount > 0);

const splitAcrossInstallments = (amount, count, includeInInstallments = false) => {
  const safeAmount = round2(amount);
  const safeCount = clamp(count, 1, 24);
  if (safeAmount <= 0) {
    return Array.from({ length: safeCount }, () => 0);
  }

  if (!includeInInstallments) {
    return [safeAmount, ...Array.from({ length: safeCount - 1 }, () => 0)];
  }

  const base = Math.floor((safeAmount / safeCount) * 100) / 100;
  let assigned = 0;
  const chunks = [];
  for (let i = 0; i < safeCount; i++) {
    const isLast = i === safeCount - 1;
    const value = isLast ? round2(safeAmount - assigned) : round2(base);
    chunks.push(value);
    assigned = round2(assigned + value);
  }
  return chunks;
};

const rebalanceInstallmentsToTarget = (installments = [], targetTotal = 0) => {
  const normalized = installments.map((item) => ({
    ...item,
    amount: round2(Math.max(0, item.amount || 0)),
  }));

  if (normalized.length === 0) return normalized;

  const target = round2(Math.max(0, targetTotal || 0));
  const current = round2(
    normalized.reduce((sum, item) => sum + (item.amount || 0), 0),
  );
  const diff = round2(target - current);

  if (diff === 0) return normalized;

  if (diff > 0) {
    const lastIndex = normalized.length - 1;
    normalized[lastIndex].amount = round2(normalized[lastIndex].amount + diff);
    return normalized;
  }

  let remainingToReduce = round2(Math.abs(diff));
  for (let i = normalized.length - 1; i >= 0 && remainingToReduce > 0; i--) {
    const available = round2(normalized[i].amount || 0);
    const reduceBy = Math.min(available, remainingToReduce);
    normalized[i].amount = round2(available - reduceBy);
    remainingToReduce = round2(remainingToReduce - reduceBy);
  }

  return normalized;
};

const generateEqualInstallments = ({
  feeConfig,
  count,
  startDate,
  targetTotal,
}) => {
  const safeCount = clamp(count, 1, 24);
  const installments = [];
  const admissionPlan = [
    round2(feeConfig.admissionFee),
    ...Array.from({ length: safeCount - 1 }, () => 0),
  ];
  const coursePlan = splitAcrossInstallments(
    feeConfig.courseFee,
    safeCount,
    true,
  );
  const certificatePlan = [
    ...Array.from({ length: safeCount - 1 }, () => 0),
    round2(feeConfig.certificateFee),
  ];
  const examPlan = splitAcrossInstallments(
    feeConfig.examFee,
    safeCount,
    feeConfig.includeExamFeeInInstallments,
  );
  const registrationPlan = splitAcrossInstallments(
    feeConfig.registrationFee,
    safeCount,
    feeConfig.includeRegistrationFeeInInstallments,
  );
  const practicalPlan = splitAcrossInstallments(
    feeConfig.practicalFee,
    safeCount,
    feeConfig.includePracticalFeeInInstallments,
  );
  const otherPlan = splitAcrossInstallments(
    feeConfig.otherFee,
    safeCount,
    feeConfig.includeOtherFeeInInstallments,
  );

  for (let i = 0; i < safeCount; i++) {
    const feeComponents = {
      admissionFee: admissionPlan[i],
      courseFee: coursePlan[i],
      certificateFee: certificatePlan[i],
      examFee: examPlan[i],
      registrationFee: registrationPlan[i],
      practicalFee: practicalPlan[i],
      otherFee: otherPlan[i],
    };
    const amount = round2(
      feeComponents.admissionFee +
        feeComponents.courseFee +
        feeComponents.certificateFee +
        feeComponents.examFee +
        feeComponents.registrationFee +
        feeComponents.practicalFee +
        feeComponents.otherFee,
    );

    installments.push({
      installmentNumber: i + 1,
      description:
        safeCount === 1
          ? "Full Payment"
          : i === 0
            ? "Admission Fee + Course Fee"
            : i === safeCount - 1
              ? "Course Fee + Certificate Fee"
              : `Course Fee Installment ${i + 1}`,
      feeComponents,
      amount,
      dueDate: addMonths(startDate, i),
      status: "Pending",
      paidAmount: 0,
    });
  }

  const currentTotal = round2(
    installments.reduce((sum, item) => sum + (item.amount || 0), 0),
  );
  const finalTarget = round2(targetTotal ?? currentTotal);
  return rebalanceInstallmentsToTarget(installments, finalTarget);
};

const normalizeInstallments = ({ installments, totalAmount, startDate }) => {
  if (!Array.isArray(installments) || installments.length === 0) {
    return [];
  }

  const normalized = installments.map((item, index) => ({
    installmentNumber: Number(item?.installmentNumber) || index + 1,
    description: item?.description?.trim() || `Installment ${index + 1}`,
    feeComponents: {
      admissionFee: round2(item?.feeComponents?.admissionFee || 0),
      courseFee: round2(item?.feeComponents?.courseFee ?? item?.amount ?? 0),
      certificateFee: round2(item?.feeComponents?.certificateFee || 0),
      examFee: round2(item?.feeComponents?.examFee || 0),
      registrationFee: round2(item?.feeComponents?.registrationFee || 0),
      practicalFee: round2(item?.feeComponents?.practicalFee || 0),
      otherFee: round2(item?.feeComponents?.otherFee || 0),
    },
    amount: round2(item?.amount),
    dueDate: item?.dueDate ? new Date(item.dueDate) : addMonths(startDate, index),
    status: normalizeInstallmentStatus(item?.status),
    paidAmount: round2(item?.paidAmount || 0),
  }));

  normalized.sort((a, b) => a.installmentNumber - b.installmentNumber);
  normalized.forEach((item, index) => {
    item.installmentNumber = index + 1;
  });

  const targetTotal = round2(totalAmount);
  return rebalanceInstallmentsToTarget(normalized, targetTotal);
};

const syncFeeStructureStatus = (feeStructure) => {
  feeStructure.paidAmount = round2(
    (feeStructure.installments || []).reduce(
      (sum, installment) => sum + Number(installment.paidAmount || 0),
      0,
    ),
  );
  feeStructure.remainingAmount = round2(
    Math.max(0, Number(feeStructure.totalFee || 0) - Number(feeStructure.paidAmount || 0)),
  );

  if (feeStructure.remainingAmount <= 0) {
    feeStructure.feeStatus = "Paid";
  } else if (feeStructure.paidAmount > 0) {
    feeStructure.feeStatus = "Partial";
  } else {
    feeStructure.feeStatus = "Unpaid";
  }
};

const applyAmountToInstallments = (feeStructure, amount, explicitInstallmentNumber = null) => {
  let remainingToApply = round2(amount);
  const installments = Array.isArray(feeStructure.installments)
    ? feeStructure.installments
    : [];

  const applyToInstallment = (installment) => {
    if (!installment || remainingToApply <= 0) return;
    const installmentAmount = round2(installment.amount || 0);
    const installmentPaid = round2(installment.paidAmount || 0);
    const installmentRemaining = round2(
      Math.max(0, installmentAmount - installmentPaid),
    );
    const applied = Math.min(installmentRemaining, remainingToApply);
    installment.paidAmount = round2(installmentPaid + applied);
    installment.status =
      installment.paidAmount >= installmentAmount
        ? "Paid"
        : installment.paidAmount > 0
          ? "Partial"
          : installment.status || "Pending";
    remainingToApply = round2(remainingToApply - applied);
  };

  if (explicitInstallmentNumber) {
    const target = installments.find(
      (item) => Number(item.installmentNumber) === Number(explicitInstallmentNumber),
    );
    applyToInstallment(target);
  } else {
    installments
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .forEach((installment) => applyToInstallment(installment));
  }
};

const createImportedPaymentRecord = async ({
  feeStructure,
  student,
  course,
  row,
  fallbackAmount = 0,
  receiptSequence,
}) => {
  const amount = round2(
    getRowValue(row, ["Amount", "amount", "Paid Amount", "paidAmount"]) ??
      fallbackAmount,
  );

  if (amount <= 0) {
    return null;
  }

  const installmentNumber = normalizeNumber(
    getRowValue(row, ["Installment Number", "installmentNumber"]),
    null,
  );
  const paymentDate =
    parseExcelDate(getRowValue(row, ["Payment Date", "paymentDate"])) || new Date();
  const paymentMethod =
    normalizeText(getRowValue(row, ["Payment Method", "paymentMethod"])) || "Cash";
  const voucherNo = normalizeText(
    getRowValue(row, ["Voucher No", "voucherNo"]),
  );
  const transactionId = normalizeText(
    getRowValue(row, ["Transaction ID", "transactionId"]),
  );
  const chequeNo = normalizeText(getRowValue(row, ["Cheque No", "chequeNo"]));
  const bankName = normalizeText(getRowValue(row, ["Bank Name", "bankName"]));
  const remarks =
    normalizeText(getRowValue(row, ["Remarks", "remarks"])) ||
    normalizeText(getRowValue(row, ["Payment Notes", "paymentNotes"])) ||
    "Imported payment";
  const paymentType = normalizePaymentType(
    getRowValue(row, ["Payment Type", "paymentType"]),
    !!installmentNumber,
  );

  receiptSequence.current += 1;
  const receiptNo = generateReceiptNumber("RCP", receiptSequence.current);

  const payment = await new FeePaymentSchema({
    receiptNo,
    voucherNo,
    student: student._id,
    course: course._id,
    feeStructure: feeStructure._id,
    installmentNumber: installmentNumber || undefined,
    amount,
    paymentDate,
    paymentMethod,
    transactionId,
    chequeNo,
    bankName,
    remarks,
    paymentType,
    status: "Completed",
  }).save();

  applyAmountToInstallments(feeStructure, amount, installmentNumber);
  if (installmentNumber) {
    const target = feeStructure.installments.find(
      (item) => Number(item.installmentNumber) === Number(installmentNumber),
    );
    if (target) {
      target.receiptNumber = receiptNo;
      target.voucherNo = voucherNo || target.voucherNo;
      target.paidDate = paymentDate;
    }
  }
  syncFeeStructureStatus(feeStructure);
  await feeStructure.save();

  createAutoAccountingEntry({
    entryType: "Income",
    preferredHeadName: "Course Fees",
    amount,
    paymentDate,
    studentName: student.studentName || "Student",
    studentRegNo: student.registrationNo,
    studentMobile: student.mobileNumber,
    courseName: course.courseName,
    receiptNo,
    voucherNo,
    paymentMethodStr: paymentMethod,
    paymentType,
    installmentNumber: installmentNumber || undefined,
    transactionId,
    chequeNo,
    bankName,
    remarks,
  }).catch((error) => {
    console.error("[AutoAccounting] Imported payment entry failed:", error);
  });

  return payment;
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

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheetRows = firstSheetName
      ? XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
          defval: null,
          raw: false,
        })
      : [];

    const studentsSheet =
      getSheetRowsByNames(workbook, ["Students", "Student", "Admissions"]) ||
      firstSheetRows;
    const enrollmentsSheet =
      getSheetRowsByNames(workbook, [
        "Enrollments",
        "Enrollment",
        "Course Assignments",
        "CourseAssignments",
      ]) || firstSheetRows;
    const installmentsSheet =
      getSheetRowsByNames(workbook, ["Installments", "Fee Installments"]) || [];
    const additionalFeesSheet =
      getSheetRowsByNames(workbook, ["Additional Fees", "AdditionalFees"]) || [];
    const paymentsSheet =
      getSheetRowsByNames(workbook, ["Payments", "Fee Payments", "Receipts"]) || [];

    if (!studentsSheet || studentsSheet.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data found in the file",
      });
    }

    const results = {
      imported: 0,
      updated: 0,
      coursesAssigned: 0,
      enrollmentsUpdated: 0,
      courseSkipped: 0,
      paymentsImported: 0,
      skipped: 0,
      errors: [],
    };
    const seenCnicOrBForms = new Set();
    const seenRegistrationNos = new Set();
    const studentsByLookup = new Map();
    const importedEnrollmentKeys = new Set();
    const additionalFeesByEnrollmentKey = new Map();
    const installmentsByEnrollmentKey = new Map();
    const paymentsByEnrollmentKey = new Map();
    const receiptSequence = {
      current: await FeePaymentSchema.countDocuments(),
    };

    additionalFeesSheet.forEach((row) => {
      const key = buildEnrollmentLookupKey(row);
      if (!key) return;
      if (!additionalFeesByEnrollmentKey.has(key)) {
        additionalFeesByEnrollmentKey.set(key, []);
      }
      additionalFeesByEnrollmentKey.get(key).push(row);
    });

    installmentsSheet.forEach((row) => {
      const key = buildEnrollmentLookupKey(row);
      if (!key) return;
      if (!installmentsByEnrollmentKey.has(key)) {
        installmentsByEnrollmentKey.set(key, []);
      }
      installmentsByEnrollmentKey.get(key).push(row);
    });

    paymentsSheet.forEach((row) => {
      const key = buildEnrollmentLookupKey(row);
      if (!key) return;
      if (!paymentsByEnrollmentKey.has(key)) {
        paymentsByEnrollmentKey.set(key, []);
      }
      paymentsByEnrollmentKey.get(key).push(row);
    });

    for (const [index, row] of studentsSheet.entries()) {
      try {
        const studentData = {};
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

        const rowLookupKey = buildStudentLookupKey({
          registrationNo: studentData.registrationNo,
          cnicOrBForm: studentData.cnicOrBForm,
        });
        if (rowLookupKey && studentsByLookup.has(rowLookupKey)) {
          continue;
        }

        if (studentData.registrationNo) {
          if (seenRegistrationNos.has(studentData.registrationNo)) {
            delete studentData.registrationNo;
          } else {
            seenRegistrationNos.add(studentData.registrationNo);
          }
        } else {
          delete studentData.registrationNo;
        }

        if (seenCnicOrBForms.has(studentData.cnicOrBForm)) {
          continue;
        }
        seenCnicOrBForms.add(studentData.cnicOrBForm);

        const existingByCnic = await AdmissionSchema.findOne({
          cnicOrBForm: studentData.cnicOrBForm,
        });
        const existingByRegistrationNo = studentData.registrationNo
          ? await AdmissionSchema.findOne({
              registrationNo: studentData.registrationNo,
            })
          : null;

        if (
          existingByCnic &&
          existingByRegistrationNo &&
          String(existingByCnic._id) !== String(existingByRegistrationNo._id)
        ) {
          results.errors.push({
            row: index + 2,
            error:
              "Registration No and CNIC/B-Form point to different existing students",
          });
          continue;
        }

        const existingStudent = existingByCnic || existingByRegistrationNo;
        let savedStudent;

        if (existingStudent) {
          const updateData = { ...studentData };
          if (!updateData.registrationNo) {
            delete updateData.registrationNo;
          }
          savedStudent = await AdmissionSchema.findByIdAndUpdate(
            existingStudent._id,
            updateData,
            { new: true, runValidators: true },
          );
          results.updated += 1;
        } else {
          savedStudent = await new AdmissionSchema(studentData).save();
          results.imported += 1;
        }

        if (savedStudent.registrationNo) {
          studentsByLookup.set(`reg:${savedStudent.registrationNo}`, savedStudent);
        }
        studentsByLookup.set(`cnic:${savedStudent.cnicOrBForm}`, savedStudent);
      } catch (err) {
        results.errors.push({
          row: index + 2,
          error: err.message,
        });
      }
    }

    for (const [index, row] of enrollmentsSheet.entries()) {
      try {
        const course = await resolveCourseFromRow(row);
        if (!course) {
          if (enrollmentsSheet === studentsSheet) {
            continue;
          }
          results.errors.push({
            row: index + 2,
            error: "Course Name or Course ID is required for enrollment rows",
          });
          continue;
        }

        const identifiers = getStudentIdentifiersFromRow(row);
        const lookupKey = buildStudentLookupKey(identifiers);
        if (!lookupKey) {
          results.errors.push({
            row: index + 2,
            error: "Registration No or CNIC/B-Form is required to link enrollment",
          });
          continue;
        }

        let student = studentsByLookup.get(lookupKey);
        if (!student) {
          student = identifiers.registrationNo
            ? await AdmissionSchema.findOne({ registrationNo: identifiers.registrationNo })
            : await AdmissionSchema.findOne({ cnicOrBForm: identifiers.cnicOrBForm });
        }

        if (!student) {
          results.errors.push({
            row: index + 2,
            error: "Student not found for enrollment row",
          });
          continue;
        }

        const enrollmentKey = buildEnrollmentLookupKey(row, course);
        if (enrollmentKey && importedEnrollmentKeys.has(enrollmentKey)) {
          continue;
        }
        if (enrollmentKey) {
          importedEnrollmentKeys.add(enrollmentKey);
        }

        const batch = await resolveBatchFromRow(row, course._id);
        const enrollmentDate =
          parseExcelDate(
            getRowValue(row, [
              "Enrollment Date",
              "enrollmentDate",
              "Course Enrollment Date",
            ]),
          ) ||
          student.registrationDate ||
          new Date();
        const enrollmentStatus = normalizeStatus(
          getRowValue(row, ["Enrollment Status", "status"]),
        );
        const enrollmentNotes = normalizeText(
          getRowValue(row, ["Enrollment Notes", "notes"]),
        );

        const existingEnrollment = await EnrollmentSchema.findOne({
          student: student._id,
          course: course._id,
        }).sort({ createdAt: -1 });

        let savedEnrollment = existingEnrollment;
        let previousBatchId = existingEnrollment?.batch?.toString() || null;

        if (existingEnrollment) {
          savedEnrollment = await EnrollmentSchema.findByIdAndUpdate(
            existingEnrollment._id,
            {
              batch: batch?._id || null,
              enrollmentDate,
              status: enrollmentStatus,
              notes: enrollmentNotes,
            },
            { new: true, runValidators: true },
          );
          if (previousBatchId !== (batch?._id?.toString() || null)) {
            if (previousBatchId) {
              await BatchSchema.findByIdAndUpdate(previousBatchId, {
                $inc: { currentStudents: -1 },
              });
            }
            if (batch?._id) {
              await BatchSchema.findByIdAndUpdate(batch._id, {
                $inc: { currentStudents: 1 },
              });
            }
          }
          results.enrollmentsUpdated += 1;
        } else {
          if (batch && batch.currentStudents >= batch.maxStudents) {
            results.courseSkipped += 1;
            results.errors.push({
              row: index + 2,
              error: `Batch is full for course ${course.courseName} (${batch.batchName})`,
            });
            continue;
          }

          savedEnrollment = await new EnrollmentSchema({
            student: student._id,
            course: course._id,
            batch: batch?._id || null,
            enrollmentDate,
            status: enrollmentStatus,
            notes: enrollmentNotes,
          }).save();

          if (batch?._id) {
            await BatchSchema.findByIdAndUpdate(batch._id, {
              $inc: { currentStudents: 1 },
            });
          }

          results.coursesAssigned += 1;
        }

        await AdmissionSchema.findByIdAndUpdate(student._id, {
          $addToSet: { enrolledCourses: course._id },
        });

        const additionalFeesRows = additionalFeesByEnrollmentKey.get(enrollmentKey) || [];
        const additionalFees = normalizeAdditionalFees(additionalFeesRows);
        const paymentPlanType = normalizePaymentPlanType(
          getRowValue(row, ["Payment Plan Type", "paymentPlanType"]),
        );
        const numberOfInstallments = clamp(
          getRowValue(row, ["Number Of Installments", "numberOfInstallments"]),
          1,
          24,
        );
        const discountPercentage = clamp(
          getRowValue(row, ["Discount Percentage", "discountPercentage"]),
          0,
          100,
        );
        const selectedAdmissionFee = round2(
          getRowValue(row, ["Admission Fee", "admissionFee"]) ?? course.admissionFee ?? 0,
        );
        const selectedCourseFee = round2(
          getRowValue(row, ["Course Fee", "courseFee"]) ?? course.courseFee ?? 0,
        );
        const selectedCertificateFee = round2(
          getRowValue(row, ["Certificate Fee", "certificateFee"]) ??
            course.certificateFee ??
            0,
        );
        const selectedExamFee = round2(
          getRowValue(row, ["Exam Fee", "examFee"]) ?? course.examFee ?? 0,
        );
        const selectedRegistrationFee = round2(
          getRowValue(row, ["Registration Fee", "registrationFee"]) ??
            course.registrationFee ??
            0,
        );
        const selectedPracticalFee = round2(
          getRowValue(row, ["Practical Fee", "practicalFee"]) ??
            course.practicalFee ??
            0,
        );
        const selectedOtherFee = round2(
          getRowValue(row, ["Other Fee", "otherFee"]) ?? course.otherFee ?? 0,
        );
        const additionalFeesTotal = round2(
          additionalFees.reduce((sum, item) => sum + item.amount, 0),
        );
        const requestedCourseDiscount = round2(
          getRowValue(row, ["Discount On Course Fee", "discountOnCourseFee"]) ??
            getRowValue(row, ["Discount", "discount"]) ??
            0,
        );
        const percentageCourseDiscount = round2(
          (selectedCourseFee * discountPercentage) / 100,
        );
        const amountDiscount = round2(
          Math.min(
            selectedCourseFee,
            requestedCourseDiscount > 0 ? requestedCourseDiscount : percentageCourseDiscount,
          ),
        );
        const discountedCourseFee = round2(
          Math.max(0, selectedCourseFee - amountDiscount),
        );
        const resolvedFinalFee = round2(
          selectedAdmissionFee +
            discountedCourseFee +
            selectedCertificateFee +
            selectedExamFee +
            selectedRegistrationFee +
            selectedPracticalFee +
            selectedOtherFee +
            additionalFeesTotal,
        );

        const importedInstallmentsRows = installmentsByEnrollmentKey.get(enrollmentKey) || [];
        let resolvedInstallments = normalizeInstallments({
          installments: importedInstallmentsRows.map((installmentRow) => ({
            installmentNumber: normalizeNumber(
              getRowValue(installmentRow, ["Installment Number", "installmentNumber"]),
              0,
            ),
            description: normalizeText(
              getRowValue(installmentRow, ["Description", "description"]),
            ),
            amount: round2(getRowValue(installmentRow, ["Amount", "amount"])),
            dueDate: parseExcelDate(
              getRowValue(installmentRow, ["Due Date", "dueDate"]),
            ),
            status: normalizeInstallmentStatus(
              getRowValue(installmentRow, ["Status", "status"]),
            ),
            paidAmount: round2(
              getRowValue(installmentRow, ["Paid Amount", "paidAmount"]),
            ),
            feeComponents: {
              admissionFee: round2(
                getRowValue(installmentRow, ["Admission Fee", "admissionFee"]),
              ),
              courseFee: round2(
                getRowValue(installmentRow, ["Course Fee", "courseFee"]),
              ),
              certificateFee: round2(
                getRowValue(installmentRow, ["Certificate Fee", "certificateFee"]),
              ),
              examFee: round2(getRowValue(installmentRow, ["Exam Fee", "examFee"])),
              registrationFee: round2(
                getRowValue(installmentRow, ["Registration Fee", "registrationFee"]),
              ),
              practicalFee: round2(
                getRowValue(installmentRow, ["Practical Fee", "practicalFee"]),
              ),
              otherFee: round2(
                getRowValue(installmentRow, ["Other Fee", "otherFee"]),
              ),
            },
          })),
          totalAmount: resolvedFinalFee,
          startDate: enrollmentDate,
        });

        if (resolvedInstallments.length === 0) {
          const fallbackCount =
            paymentPlanType === "full_payment"
              ? 1
              : numberOfInstallments ||
                (paymentPlanType === "monthly" ? course.duration || 1 : 2);

          if (paymentPlanType === "custom") {
            resolvedInstallments = generateEqualInstallments({
              feeConfig: {
                admissionFee: selectedAdmissionFee,
                courseFee: discountedCourseFee,
                certificateFee: selectedCertificateFee,
                examFee: selectedExamFee,
                registrationFee: selectedRegistrationFee,
                practicalFee: selectedPracticalFee,
                otherFee: selectedOtherFee,
                includeExamFeeInInstallments: false,
                includeRegistrationFeeInInstallments: false,
                includePracticalFeeInInstallments: false,
                includeOtherFeeInInstallments: false,
              },
              count: fallbackCount,
              startDate: enrollmentDate,
              targetTotal: resolvedFinalFee,
            });
          } else {
            const plan = calculateInstallmentPlan({
              admissionFee: selectedAdmissionFee,
              courseFee: selectedCourseFee,
              certificateFee: selectedCertificateFee,
              courseDuration: fallbackCount,
              discountOnAdmission: 0,
              discountOnCourseFee: amountDiscount,
              discountType: "courseFee",
              startDate: enrollmentDate,
            });
            resolvedInstallments = normalizeInstallments({
              installments: plan.installments,
              totalAmount: resolvedFinalFee,
              startDate: enrollmentDate,
            });
          }
        }

        let feeStructure = await FeeStructureSchema.findOne({
          enrollment: savedEnrollment._id,
        });

        const feeStructurePayload = {
          student: student._id,
          course: course._id,
          enrollment: savedEnrollment._id,
          admissionFee: selectedAdmissionFee,
          courseFee: selectedCourseFee,
          certificateFee: selectedCertificateFee,
          examFee: selectedExamFee,
          registrationFee: selectedRegistrationFee,
          practicalFee: selectedPracticalFee,
          otherFee: selectedOtherFee,
          additionalFees,
          discount: amountDiscount,
          discountPercentage,
          paymentPlanType,
          discountOnAdmission: 0,
          discountOnCourseFee: amountDiscount,
          discountType: amountDiscount > 0 ? "courseFee" : "none",
          totalFee: resolvedFinalFee,
          paidAmount: 0,
          remainingAmount: resolvedFinalFee,
          installmentEnabled: resolvedInstallments.length > 1,
          numberOfInstallments: resolvedInstallments.length,
          installmentAmount: resolvedInstallments[0]?.amount || resolvedFinalFee,
          installments: resolvedInstallments,
          feeStatus: normalizeFeeStatus(
            getRowValue(row, ["Fee Status", "feeStatus"]),
          ),
          notes: normalizeText(getRowValue(row, ["Fee Notes", "feeNotes"])),
          systemGrantedNumber:
            student.registrationNo && student.registrationNo !== "null"
              ? String(student.registrationNo).trim()
              : null,
        };

        if (feeStructure) {
          Object.assign(feeStructure, feeStructurePayload);
        } else {
          feeStructure = new FeeStructureSchema(feeStructurePayload);
        }

        syncFeeStructureStatus(feeStructure);
        await feeStructure.save();

        const paymentRows = paymentsByEnrollmentKey.get(enrollmentKey) || [];
        for (const paymentRow of paymentRows) {
          const payment = await createImportedPaymentRecord({
            feeStructure,
            student,
            course,
            row: paymentRow,
            receiptSequence,
          });
          if (payment) {
            results.paymentsImported += 1;
          }
        }

        const legacyPaidAmount = round2(
          getRowValue(row, ["Paid Amount", "paidAmount"]) ?? 0,
        );
        if (paymentRows.length === 0 && legacyPaidAmount > 0) {
          const payment = await createImportedPaymentRecord({
            feeStructure,
            student,
            course,
            row: {
              Amount: legacyPaidAmount,
              "Payment Date":
                parseExcelDate(getRowValue(row, ["Due Date", "dueDate"])) || enrollmentDate,
              Remarks: "Imported opening payment",
              "Installment Number": 1,
            },
            receiptSequence,
          });
          if (payment) {
            results.paymentsImported += 1;
          }
        }
      } catch (err) {
        results.errors.push({
          row: index + 2,
          error: err.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message:
        `Bulk import completed: ${results.imported} imported, ` +
        `${results.updated} updated, ${results.coursesAssigned} enrollment(s) created, ` +
        `${results.enrollmentsUpdated} enrollment(s) updated, ${results.paymentsImported} payment(s) imported`,
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
