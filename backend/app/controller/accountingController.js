// controllers/accountingController.js
import AccountingType from "../modules/accountingTypeModule.js";
import HeadOfAccount from "../modules/headOfAccountModule.js";
import PaymentMethod from "../modules/paymentMethodModule.js";
import AccountingTransaction from "../modules/accountingTransactionModule.js";
import FundTransfer from "../modules/fundTransferModule.js";
import FeeStructure from "../modules/feeStructureModule.js";
import FeePayment from "../modules/feePaymentModule.js";
import Enrollment from "../modules/enrollmentModule.js";
import AppSettings from "../modules/appSettingsModule.js";
import TeacherPayroll from "../modules/teacherPayrollModule.js";
import TeacherSchema from "../modules/teacherModule.js";
import ExpenseHeadEntry from "../modules/expenseHeadEntryModule.js";
import CourseSchema from "../modules/courseModule.js";
import { calculateTeacherCompensationData } from "../controller/teacherController.js";
import PDFKit from "pdfkit";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";

const getAccountingVisibilitySettings = async () => {
  const settings = await AppSettings.findOne().lean();
  return settings || { showAccountingBalancesToUsers: false };
};

const canViewAccountingBalances = async (req) => {
  if (req.currentUser?.isSuperAdmin || req.user?.isSuperAdmin) {
    return true;
  }

  const settings = await getAccountingVisibilitySettings();
  return settings.showAccountingBalancesToUsers === true;
};

const denyRestrictedAccountingAccess = (res) =>
  res.status(403).json({
    success: false,
    message:
      "This financial summary is restricted to the super admin. Ask the super admin to enable accounting balance visibility if needed.",
  });

const findAccountingTypeByAnyId = async (typeId) => {
  const rawTypeId = String(typeId || "").trim();
  if (!rawTypeId) {
    return null;
  }

  const mongoose = (await import("mongoose")).default;
  const collection = mongoose.connection.db.collection("accountingtypes");

  const stringIdMatch = await collection.findOne({ _id: rawTypeId });
  if (stringIdMatch) {
    return stringIdMatch;
  }

  if (mongoose.Types.ObjectId.isValid(rawTypeId)) {
    const objectIdMatch = await collection.findOne({
      _id: new mongoose.Types.ObjectId(rawTypeId),
    });
    if (objectIdMatch) {
      return objectIdMatch;
    }
  }

  return null;
};

const findPaymentMethodByAnyId = async (paymentMethodId) => {
  const rawPaymentMethodId = String(paymentMethodId || "").trim();
  if (!rawPaymentMethodId) {
    return null;
  }

  const mongoose = (await import("mongoose")).default;
  const collection = mongoose.connection.db.collection("paymentmethods");

  const stringIdMatch = await collection.findOne({ _id: rawPaymentMethodId });
  if (stringIdMatch) {
    return PaymentMethod.findOne({ name: stringIdMatch.name, isActive: true });
  }

  if (mongoose.Types.ObjectId.isValid(rawPaymentMethodId)) {
    const objectIdMatch = await collection.findOne({
      _id: new mongoose.Types.ObjectId(rawPaymentMethodId),
    });
    if (objectIdMatch) {
      return PaymentMethod.findOne({ name: objectIdMatch.name, isActive: true });
    }
  }

  return PaymentMethod.findOne({
    name: { $regex: new RegExp(`^${rawPaymentMethodId}$`, "i") },
    isActive: true,
  });
};

const findHeadOfAccountByAnyId = async (headId) => {
  const rawHeadId = String(headId || "").trim();
  if (!rawHeadId) {
    return null;
  }

  const mongoose = (await import("mongoose")).default;
  const collection = mongoose.connection.db.collection("headofaccounts");

  const stringIdMatch = await collection.findOne({ _id: rawHeadId });
  if (stringIdMatch) {
    return HeadOfAccount.findOne({
      name: stringIdMatch.name,
      isActive: { $ne: false },
    });
  }

  if (mongoose.Types.ObjectId.isValid(rawHeadId)) {
    const objectIdMatch = await collection.findOne({
      _id: new mongoose.Types.ObjectId(rawHeadId),
    });
    if (objectIdMatch) {
      return HeadOfAccount.findOne({
        name: objectIdMatch.name,
        isActive: { $ne: false },
      });
    }
  }

  return HeadOfAccount.findOne({
    name: { $regex: new RegExp(`^${rawHeadId}$`, "i") },
    isActive: { $ne: false },
  });
};

const serializeTransactionRecord = async (transactionDoc) => {
  const data =
    typeof transactionDoc?.toObject === "function"
      ? transactionDoc.toObject()
      : { ...transactionDoc };

  const resolvedType =
    data?.type?.name
      ? data.type
      : await findAccountingTypeByAnyId(data?.type?._id || data?.type || "");
  const resolvedHead =
    data?.head?.name
      ? data.head
      : await findHeadOfAccountByAnyId(data?.head?._id || data?.head || "");
  const resolvedPaymentMethod =
    data?.paymentMethod?.name
      ? data.paymentMethod
      : await findPaymentMethodByAnyId(
          data?.paymentMethod?._id || data?.paymentMethod || "",
        );

  return {
    ...data,
    revertSourceType:
      resolvedType?.name === "Income" &&
      (String(data?.name || "").toLowerCase().startsWith("fee payment") ||
        String(data?.billReference || "").toUpperCase().startsWith("RCP-"))
        ? "fee_payment"
        : String(data?.name || "").toLowerCase().startsWith("expense payment")
          ? "expense_head_entry"
          : "transaction",
    canRevert: true,
    type: resolvedType
      ? { _id: resolvedType._id, name: resolvedType.name }
      : data?.type || null,
    head: resolvedHead
      ? {
          _id: resolvedHead._id,
          name: resolvedHead.name,
        }
      : data?.head || null,
    paymentMethod: resolvedPaymentMethod
      ? {
          _id: resolvedPaymentMethod._id,
          name: resolvedPaymentMethod.name,
          type: resolvedPaymentMethod.type,
        }
      : data?.paymentMethod || null,
  };
};

const serializeHeadWithType = async (headDoc) => {
  if (!headDoc) {
    return null;
  }

  const head =
    typeof headDoc.toObject === "function" ? headDoc.toObject() : { ...headDoc };

  if (head.type?.name) {
    return {
      ...head,
      typeLabel: head.type.name,
    };
  }

  const typeId = head.type?._id || head.type || null;
  if (!typeId) {
    return { ...head, type: null };
  }

  const typeRecord = await findAccountingTypeByAnyId(typeId);
  return {
    ...head,
    type: typeRecord ? { _id: typeRecord._id, name: typeRecord.name } : null,
    typeLabel: typeRecord?.name || null,
  };
};

const sanitizeTransferBalanceFields = (transfer, balancesVisible) => {
  const data = transfer?.toObject ? transfer.toObject() : transfer;

  if (!balancesVisible) {
    if (data?.fromMethod) data.fromMethod.currentBalance = null;
    if (data?.toMethod) data.toMethod.currentBalance = null;
  }

  return data;
};

const getMonthRange = (monthValue) => {
  const now = new Date();
  const [yearPart, monthPart] = String(
    monthValue || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  )
    .split("-")
    .map((value) => Number(value));

  const year = Number.isFinite(yearPart) ? yearPart : now.getFullYear();
  const monthIndex = Number.isFinite(monthPart) ? Math.max(1, monthPart) - 1 : now.getMonth();
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);

  return {
    start,
    end,
    monthKey: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    label: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
  };
};

const getDefaultPayrollPeriod = () => {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
};

const getTeacherPayrollSalaryConfig = (teacher, payrollRecord = null) => {
  if (payrollRecord) {
    const salaryType = payrollRecord.salaryType || "per_student";
    const salaryPerStudent =
      payrollRecord.salaryPerStudent !== undefined &&
      payrollRecord.salaryPerStudent !== null
        ? Number(payrollRecord.salaryPerStudent)
        : 0;
    const attendanceThreshold =
      payrollRecord.attendanceThreshold !== undefined &&
      payrollRecord.attendanceThreshold !== null
        ? Number(payrollRecord.attendanceThreshold)
        : 50;
    const monthlySalary =
      payrollRecord.monthlySalary !== undefined && payrollRecord.monthlySalary !== null
        ? payrollRecord.monthlySalary
        : null;

    return {
      salaryType,
      monthlySalary,
      salaryPerStudent,
      attendanceThreshold,
      isConfigured:
        salaryType === "per_student"
          ? salaryPerStudent !== null && salaryPerStudent !== undefined && Number(salaryPerStudent) > 0
          : Boolean(monthlySalary),
    };
  }

  if ((teacher.salaryType || "fixed") === "per_student") {
    return {
      salaryType: "per_student",
      monthlySalary: null,
      salaryPerStudent: 0,
      attendanceThreshold: Number(teacher.attendanceThreshold ?? 50),
      isConfigured: false,
    };
  }

  return {
    salaryType: teacher.salaryType || "fixed",
    monthlySalary: teacher.monthlySalary ?? null,
    salaryPerStudent: teacher.salaryPerStudent ?? null,
    attendanceThreshold: Number(teacher.attendanceThreshold ?? 50),
    isConfigured: true,
  };
};

// ============================================================
// ACCOUNTING TYPES
// ============================================================

// GET /accounting/types — list all seeded types
export const getAccountingTypes = async (req, res) => {
  try {
    const defaultTypes = [
      {
        name: "Income",
        description: "All money received by the organisation",
      },
      {
        name: "Expense",
        description: "All money spent by the organisation",
      },
      {
        name: "Assets",
        description: "Resources owned by the organisation",
      },
      {
        name: "Liabilities",
        description: "Amounts owed by the organisation",
      },
      {
        name: "Equity",
        description: "Owner or retained value in the organisation",
      },
    ];

    for (const type of defaultTypes) {
      await AccountingType.updateOne(
        { name: type.name },
        {
          $setOnInsert: {
            _id: type.name.toLowerCase(),
            ...type,
          },
        },
        { upsert: true },
      );
    }

    const types = await AccountingType.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: types,
      message: "Accounting types retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching accounting types:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ============================================================
// HEADS OF ACCOUNT
// ============================================================

const resolveAccountingTypeId = async (typeValue) => {
  const rawType = String(typeValue || "").trim();
  if (!rawType) {
    return null;
  }

  const existingTypeById = await findAccountingTypeByAnyId(rawType);
  if (existingTypeById) {
    return existingTypeById._id;
  }

  const normalizedType = rawType.toLowerCase();
  const matchedType = await AccountingType.findOne({
    name: { $regex: new RegExp(`^${normalizedType}$`, "i") },
  }).lean();

  return matchedType?._id || null;
};

const getExpenseTypeRecord = async () =>
  AccountingType.findOne({
    name: { $regex: /^expense$/i },
  }).lean();

const getExpenseHeadFilter = async () => {
  const expenseType = await getExpenseTypeRecord();
  return expenseType?._id ? { type: expenseType._id } : null;
};

const buildExpenseEntryDetails = ({
  payeeName,
  paymentPurpose,
  paymentMethodName,
  voucherNo,
  chequeNoOrTransactionId,
  amountInWords,
  description,
}) => {
  const lines = [];
  if (payeeName) lines.push(`Payee: ${payeeName}`);
  if (paymentPurpose) lines.push(`Purpose: ${paymentPurpose}`);
  if (paymentMethodName) lines.push(`Method: ${paymentMethodName}`);
  if (voucherNo) lines.push(`Voucher: ${voucherNo}`);
  if (chequeNoOrTransactionId) lines.push(`Cheque/Txn ID: ${chequeNoOrTransactionId}`);
  if (amountInWords) lines.push(`Amount in words: ${amountInWords}`);
  if (description) lines.push(`Remarks: ${description}`);
  return lines.join("\n");
};

const getSharedPartyNames = async () => {
  const [expensePayeeNames, transactionNames] = await Promise.all([
    ExpenseHeadEntry.distinct("payeeName", {
      isActive: true,
      payeeName: { $nin: ["", null] },
    }),
    AccountingTransaction.distinct("name", {
      name: { $nin: ["", null] },
    }),
  ]);

  return Array.from(
    new Set(
      [...expensePayeeNames, ...transactionNames]
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
};

const serializeExpenseHeadEntry = async (entry) => {
  const data = entry?.toObject ? entry.toObject() : entry;
  const resolvedExpenseHead =
    data?.expenseCategory?.name
      ? data.expenseCategory
      : await findHeadOfAccountByAnyId(
          data?.expenseCategory?._id || data?.expenseCategory || "",
        );
  const resolvedTransaction =
    data?.transactionId?.paymentMethod || data?.transactionId?.transactionNo
      ? data.transactionId
      : data?.transactionId
        ? await AccountingTransaction.findById(
            data.transactionId?._id || data.transactionId,
          )
            .populate("paymentMethod", "name type")
            .lean()
        : null;
  const resolvedPaymentMethod =
    data?.paymentMethod?.name
      ? data.paymentMethod
      : resolvedTransaction?.paymentMethod?.name
        ? resolvedTransaction.paymentMethod
        : await findPaymentMethodByAnyId(
            data?.paymentMethod?._id ||
              data?.paymentMethod ||
              resolvedTransaction?.paymentMethod?._id ||
              resolvedTransaction?.paymentMethod ||
              "",
          );

  return {
    ...data,
    expenseCategoryLabel:
      resolvedExpenseHead?.name ||
      data?.expenseCategory?.name ||
      data?.expenseCategoryLabel ||
      "",
    expenseCategory:
      resolvedExpenseHead || data?.expenseCategory || null,
    paymentMethodLabel:
      resolvedPaymentMethod?.name || data?.paymentMethodLabel || "",
    paymentMethod:
      resolvedPaymentMethod ||
      data?.paymentMethod ||
      resolvedTransaction?.paymentMethod ||
      null,
  };
};

const getNextExpenseVoucherNo = async () => {
  const entries = await ExpenseHeadEntry.find({ isActive: true })
    .select("voucherNo")
    .lean();

  let maxVoucherNumber = 0;
  entries.forEach((entry) => {
    const match = String(entry?.voucherNo || "").match(/^(\d+)$/);
    if (!match) {
      return;
    }
    maxVoucherNumber = Math.max(maxVoucherNumber, Number(match[1]));
  });

  return String(maxVoucherNumber + 1).padStart(3, "0");
};

// GET /accounting/heads — list all active heads (optional ?type=id)
export const getHeadsOfAccount = async (req, res) => {
  try {
    const { type, includeInactive } = req.query;
    const filter = {};

    if (!includeInactive) filter.isActive = true;
    if (type) filter.type = type;

    const heads = await HeadOfAccount.find(filter)
      .populate("type", "name")
      .sort({ name: 1 });

    const serializedHeads = await Promise.all(
      heads.map((head) => serializeHeadWithType(head)),
    );

    res.status(200).json({
      success: true,
      data: serializedHeads,
      message: "Heads of account retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching heads of account:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /accounting/heads — create a new head
export const createHeadOfAccount = async (req, res) => {
  try {
    const { name, type, description } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "Name and accounting type are required",
      });
    }

    const resolvedTypeId = await resolveAccountingTypeId(type);
    if (!resolvedTypeId) {
      return res.status(400).json({
        success: false,
        message: "Valid accounting type is required",
      });
    }

    // Check if a head with the same name exists under the same type
    const existing = await HeadOfAccount.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      type: resolvedTypeId,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "A head of account with this name already exists for this type",
      });
    }

    const head = new HeadOfAccount({
      name: name.trim(),
      type: resolvedTypeId,
      description: description?.trim() || "",
    });

    await head.save();
    await head.populate("type", "name");
    const serializedHead = await serializeHeadWithType(head);

    res.status(201).json({
      success: true,
      data: serializedHead,
      message: "Head of account created successfully",
    });
  } catch (error) {
    console.error("Error creating head of account:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /accounting/heads/:id — update a head
export const updateHeadOfAccount = async (req, res) => {
  try {
    const id = req.params.id || req.body.id || req.body._id;
    const { name, type, description, isActive, originalHead } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Head ID is required to update a head of account",
      });
    }

    const mongoose = (await import("mongoose")).default;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid head of account ID",
      });
    }

    let head = await HeadOfAccount.findById(id);
    if (!head && originalHead) {
      const originalFilter = {};

      if (originalHead.id && mongoose.Types.ObjectId.isValid(originalHead.id)) {
        originalFilter._id = originalHead.id;
      } else {
        if (originalHead.name) {
          originalFilter.name = originalHead.name.trim();
        }
        if (originalHead.type && mongoose.Types.ObjectId.isValid(originalHead.type)) {
          originalFilter.type = originalHead.type;
        }
        if (originalHead.description !== undefined) {
          originalFilter.description = (originalHead.description || "").trim();
        }
        if (originalHead.isActive !== undefined) {
          originalFilter.isActive = originalHead.isActive;
        }
      }

      if (Object.keys(originalFilter).length > 0) {
        head = await HeadOfAccount.findOne(originalFilter);
      }
    }

    if (!head) {
      return res.status(404).json({
        success: false,
        message: "Head of account not found",
      });
    }

    const nextName = name ? name.trim() : head.name;
    const resolvedNextType = type
      ? await resolveAccountingTypeId(type)
      : head.type;

    if (!resolvedNextType) {
      return res.status(400).json({
        success: false,
        message: "Valid accounting type is required",
      });
    }

    if (name || type) {
      const existing = await HeadOfAccount.findOne({
        _id: { $ne: head._id },
        name: { $regex: new RegExp(`^${nextName}$`, "i") },
        type: resolvedNextType,
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message:
            "A head of account with this name already exists for this type",
        });
      }
    }

    head.name = nextName;
    head.type = resolvedNextType;
    if (description !== undefined) head.description = description?.trim() || "";
    if (isActive !== undefined) head.isActive = isActive;

    await head.save();
    await head.populate("type", "name");
    const serializedHead = await serializeHeadWithType(head);

    res.status(200).json({
      success: true,
      data: serializedHead,
      message: "Head of account updated successfully",
    });
  } catch (error) {
    console.error("Error updating head of account:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /accounting/heads/:id — soft-delete (isActive = false)
export const deleteHeadOfAccount = async (req, res) => {
  try {
    const id = req.params.id || req.body.id || req.body._id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Head ID is required to deactivate a head of account",
      });
    }

    const mongoose = (await import("mongoose")).default;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid head of account ID",
      });
    }

    const head = await HeadOfAccount.findById(id);
    if (!head) {
      return res.status(404).json({
        success: false,
        message: "Head of account not found",
      });
    }

    head.isActive = false;
    await head.save();

    res.status(200).json({
      success: true,
      message: "Head of account deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting head of account:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ============================================================
// PAYMENT METHODS (Banks & Cash)
// ============================================================

// GET /accounting/payment-methods
export const getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ isActive: true })
      .sort({
        isDefault: -1,
        name: 1,
      })
      .lean();

    const methodIds = methods
      .map((method) => String(method?._id || "").trim())
      .filter(Boolean);

    const [incomeType, expenseType, transactions, transfers, feePayments] =
      await Promise.all([
        AccountingType.findOne({ name: "Income" }).lean(),
        AccountingType.findOne({ name: "Expense" }).lean(),
        methodIds.length
          ? AccountingTransaction.find({
              paymentMethod: { $in: methodIds },
            })
              .select("paymentMethod type amount billReference")
              .lean()
          : [],
        methodIds.length
          ? FundTransfer.find({
              $or: [
                { fromMethod: { $in: methodIds } },
                { toMethod: { $in: methodIds } },
              ],
            })
              .select("fromMethod toMethod amount")
              .lean()
          : [],
        FeePayment.find({
          status: "Completed",
        })
          .select(
            "receiptNo voucherNo amount paymentMethod accountingPaymentMethodId",
          )
          .lean(),
      ]);

    const methodsById = new Map(
      methods.map((method) => [
        String(method?._id || "").trim(),
        {
          ...method,
          openingBalance: Number(method?.openingBalance || 0),
          currentBalance: Number(method?.openingBalance || 0),
          storedCurrentBalance: Number(method?.currentBalance || 0),
          legacyReceiptAdjustments: 0,
        },
      ]),
    );

    const methodsByName = new Map(
      methods.map((method) => [
        String(method?.name || "").trim().toLowerCase(),
        String(method?._id || "").trim(),
      ]),
    );

    const incomeTypeId = String(incomeType?._id || "").trim();
    const expenseTypeId = String(expenseType?._id || "").trim();

    transactions.forEach((txn) => {
      const methodId = String(txn?.paymentMethod || "").trim();
      const targetMethod = methodsById.get(methodId);
      if (!targetMethod) return;

      const txnTypeId = String(txn?.type || "").trim();
      const amount = Number(txn?.amount || 0);

      if (txnTypeId && txnTypeId === incomeTypeId) {
        targetMethod.currentBalance += amount;
      } else if (txnTypeId && txnTypeId === expenseTypeId) {
        targetMethod.currentBalance -= amount;
      }
    });

    transfers.forEach((transfer) => {
      const fromMethod = methodsById.get(String(transfer?.fromMethod || "").trim());
      const toMethod = methodsById.get(String(transfer?.toMethod || "").trim());
      const amount = Number(transfer?.amount || 0);

      if (fromMethod) fromMethod.currentBalance -= amount;
      if (toMethod) toMethod.currentBalance += amount;
    });

    const incomeTxnRefsByMethod = new Map();
    transactions.forEach((txn) => {
      const methodId = String(txn?.paymentMethod || "").trim();
      const txnTypeId = String(txn?.type || "").trim();
      const ref = String(txn?.billReference || "").trim();
      if (!methodId || !ref || txnTypeId !== incomeTypeId) return;

      if (!incomeTxnRefsByMethod.has(methodId)) {
        incomeTxnRefsByMethod.set(methodId, new Set());
      }
      incomeTxnRefsByMethod.get(methodId).add(ref);
    });

    const resolveFeePaymentMethodId = (payment) => {
      const accountingMethodId = String(
        payment?.accountingPaymentMethodId || "",
      ).trim();
      if (accountingMethodId && methodsById.has(accountingMethodId)) {
        return accountingMethodId;
      }

      const methodName = String(payment?.paymentMethod || "")
        .trim()
        .toLowerCase();
      if (!methodName) return null;

      return methodsByName.get(methodName) || null;
    };

    feePayments.forEach((payment) => {
      const resolvedMethodId = resolveFeePaymentMethodId(payment);
      if (!resolvedMethodId) return;

      const knownRefs = incomeTxnRefsByMethod.get(resolvedMethodId) || new Set();
      const receiptNo = String(payment?.receiptNo || "").trim();
      const voucherNo = String(payment?.voucherNo || "").trim();
      const hasAccountingTxn =
        (receiptNo && knownRefs.has(receiptNo)) ||
        (voucherNo && knownRefs.has(voucherNo));

      if (hasAccountingTxn) return;

      const targetMethod = methodsById.get(resolvedMethodId);
      if (!targetMethod) return;

      const amount = Number(payment?.amount || 0);
      targetMethod.currentBalance += amount;
      targetMethod.legacyReceiptAdjustments += amount;
    });

    const data = methods.map((method) => {
      const reconciledMethod = methodsById.get(String(method?._id || "").trim());
      return {
        ...reconciledMethod,
        currentBalance: Number(reconciledMethod?.currentBalance || 0),
      };
    });

    res.status(200).json({
      success: true,
      data,
      meta: { balancesVisible: true, reconciled: true },
      message: "Payment methods retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /accounting/payment-methods — create a new bank
export const createPaymentMethod = async (req, res) => {
  try {
    const { name, bankDetails, openingBalance, type } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Payment method name is required",
      });
    }

    const cleanedName = String(name).trim();
    if (!cleanedName) {
      return res.status(400).json({
        success: false,
        message: "Payment method name is required",
      });
    }

    const existing = await PaymentMethod.findOne({
      name: { $regex: new RegExp(`^${cleanedName}$`, "i") },
      isActive: true,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A payment method with this name already exists",
      });
    }

    const normalizedType = ["cash", "bank", "other"].includes(type)
      ? type
      : "bank";
    const opening = Number(openingBalance) || 0;

    const method = new PaymentMethod({
      name: cleanedName,
      type: normalizedType,
      bankDetails: bankDetails || {},
      openingBalance: opening,
      currentBalance: opening,
      isDefault: false,
    });

    await method.save();

    res.status(201).json({
      success: true,
      data: method,
      message: "Payment method created successfully",
    });
  } catch (error) {
    console.error("Error creating payment method:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /accounting/payment-methods/:id — update bank details
export const updatePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, bankDetails } = req.body;

    const method = await PaymentMethod.findById(id);
    if (!method) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    if (name) method.name = name.trim();
    if (bankDetails)
      method.bankDetails = { ...method.bankDetails, ...bankDetails };

    await method.save();

    res.status(200).json({
      success: true,
      data: method,
      message: "Payment method updated successfully",
    });
  } catch (error) {
    console.error("Error updating payment method:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /accounting/payment-methods/:id — deactivate (cannot deactivate Cash or one with transactions)
export const deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;

    const method = await PaymentMethod.findById(id);
    if (!method) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    if (method.isDefault) {
      return res.status(403).json({
        success: false,
        message: "Cash account cannot be deactivated",
      });
    }

    method.isActive = false;
    await method.save();

    res.status(200).json({
      success: true,
      message: "Payment method deactivated successfully",
    });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ============================================================
// ACCOUNTING TRANSACTIONS
// ============================================================

// Auto-generate transaction number: TXN-2026-00001
const generateTransactionNo = async () => {
  const year = new Date().getFullYear();
  const prefix = `TXN-${year}-`;
  const last = await AccountingTransaction.findOne(
    { transactionNo: { $regex: `^${prefix}` } },
    {},
    { sort: { transactionNo: -1 } },
  );
  if (!last) return `${prefix}00001`;
  const seq = parseInt(last.transactionNo.split("-")[2], 10) + 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
};

// Balance mutator — direction: +1 for income, -1 for expense
const adjustBalance = async (paymentMethodId, amount, direction) => {
  await PaymentMethod.findByIdAndUpdate(paymentMethodId, {
    $inc: { currentBalance: direction * amount },
  });
};

const selectTeacherPayrollFundingMethod = async (requestedPaymentMethodId, amount) => {
  const normalizedAmount = Number(amount || 0);
  const activeMethods = await PaymentMethod.find({ isActive: true }).sort({
    isDefault: -1,
    currentBalance: -1,
    name: 1,
  });

  const totalAcademyBalance = activeMethods.reduce(
    (sum, method) => sum + Number(method.currentBalance || 0),
    0,
  );

  if (totalAcademyBalance < normalizedAmount) {
    return {
      success: false,
      statusCode: 400,
      message: `Insufficient academy balance. Total available balance is PKR ${totalAcademyBalance.toLocaleString("en-PK")}, but PKR ${normalizedAmount.toLocaleString("en-PK")} is required for this salary payment.`,
    };
  }

  let selectedMethod = null;
  if (requestedPaymentMethodId) {
    selectedMethod =
      activeMethods.find(
        (method) =>
          String(method._id) === String(requestedPaymentMethodId) &&
          Number(method.currentBalance || 0) >= normalizedAmount,
      ) || null;
  }

  if (!selectedMethod) {
    selectedMethod =
      activeMethods.find((method) => Number(method.currentBalance || 0) >= normalizedAmount) ||
      null;
  }

  if (!selectedMethod) {
    return {
      success: false,
      statusCode: 400,
      message:
        "Academy balance exists, but no single Cash or Bank account has enough amount for this salary payment. Please move balance between accounts first.",
    };
  }

  return {
    success: true,
    method: selectedMethod,
    totalAcademyBalance,
  };
};

// GET /accounting/monthly-summary — income & expense grouped by month (last N months)
export const getTeacherPayrollSummary = async (req, res) => {
  try {
    const { year, month, status, search = "", page = 1, limit = 20 } = req.query;
    const defaultPayrollPeriod = getDefaultPayrollPeriod();
    const selectedYear = Number(year) || defaultPayrollPeriod.year;
    const selectedMonth = Number(month) || defaultPayrollPeriod.month;

    const teacherFilter = {};
    if (search.trim()) {
      const queryText = new RegExp(search.trim(), "i");
      teacherFilter.$or = [
        { fullName: queryText },
        { teacherId: queryText },
        { contactNo: queryText },
        { designation: queryText },
      ];
    }

    const teachers = await TeacherSchema.find(teacherFilter)
      .populate("courseId", "courseName courseId")
      .sort({ fullName: 1 })
      .lean();

    const payrollRecords = await TeacherPayroll.find({
      year: selectedYear,
      month: selectedMonth,
    }).lean();

    const payrollMap = new Map(
      payrollRecords
        .filter((record) => record?.teacher)
        .map((record) => [String(record.teacher), record]),
    );

    const payrollItems = await Promise.all(
      teachers.map(async (teacher) => {
        const existingPayroll = payrollMap.get(String(teacher._id));
        if (existingPayroll?.isDeleted === true) {
          return null;
        }
        const salaryConfigOverride = getTeacherPayrollSalaryConfig(teacher, existingPayroll);
        const compensation = await calculateTeacherCompensationData(
          teacher,
          selectedYear,
          selectedMonth,
          {
            studentAdjustments: existingPayroll?.studentAdjustments || [],
            salaryConfigOverride,
            payrollAdjustments: {
              deductionAmount: existingPayroll?.deductionAmount || 0,
              deductionNote: existingPayroll?.deductionNote || "",
              bonusAmount: existingPayroll?.bonusAmount || 0,
              bonusNote: existingPayroll?.bonusNote || "",
            },
          },
        );
        const payrollTotals = calculatePayrollTotals({
          baseDueAmount: Number(
            compensation.summary.finalMonthlySalary ||
              compensation.summary.calculatedMonthlySalary ||
              0,
          ),
          carryForwardInAmount: 0,
          paidAmount: Number(existingPayroll?.paidAmount || 0),
        });

        return {
          _id: existingPayroll ? existingPayroll._id : null,
          teacher: {
            _id: teacher._id,
            fullName: teacher.fullName,
            teacherId: teacher.teacherId,
            salaryType: teacher.salaryType,
            monthlySalary: teacher.monthlySalary,
            salaryPerStudent: teacher.salaryPerStudent,
            attendanceThreshold: teacher.attendanceThreshold,
            courseId: teacher.courseId,
          },
          month: compensation.month,
          salaryConfig: compensation.salaryConfig,
          summary: compensation.summary,
          studentsForSalary: compensation.studentsForSalary,
          courses: compensation.courses,
          payroll: {
            dueAmount: payrollTotals.totalDueAmount,
            baseDueAmount: payrollTotals.baseDueAmount,
            carryForwardInAmount: payrollTotals.carryForwardInAmount,
            carryForwardSourceMonth: null,
            carryForwardEligibleAmount: payrollTotals.carryForwardEligibleAmount,
            paidAmount: payrollTotals.paidAmount,
            appliedToCarry: payrollTotals.appliedToCarry,
            appliedToCurrent: payrollTotals.appliedToCurrent,
            remainingAmount: payrollTotals.remainingAmount,
            overpaidAmount: payrollTotals.overpaidAmount,
            status: payrollTotals.status,
            paymentEntries: existingPayroll?.paymentEntries || [],
          },
        };
      }),
    );

    const visiblePayrollItems = payrollItems.filter(Boolean);
    const filteredItems = status
      ? visiblePayrollItems.filter((item) => item.payroll.status === status)
      : visiblePayrollItems;

    const paginated = filteredItems.slice(
      (Number(page) - 1) * Number(limit),
      Number(page) * Number(limit),
    );

    res.status(200).json({
      success: true,
      data: paginated,
      pagination: {
        total: filteredItems.length,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching teacher payroll summary:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const payTeacherPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      paymentMethodId,
      head,
      headId,
      amount,
      baseAmount,
      deductionAmount,
      deductionNote,
      bonusAmount,
      bonusNote,
      paymentDate,
      details,
      year,
      month,
    } = req.body;

    if ((amount === undefined && baseAmount === undefined) || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: "salary amount and payment date are required",
      });
    }

    const normalizedBaseAmount = Number(
      baseAmount !== undefined ? baseAmount : amount,
    );
    const normalizedDeductionAmount = Math.max(0, Number(deductionAmount || 0));
    const normalizedBonusAmount = Math.max(0, Number(bonusAmount || 0));
    const normalizedPaymentAmount =
      normalizedBaseAmount - normalizedDeductionAmount + normalizedBonusAmount;

    if (!Number.isFinite(normalizedBaseAmount) || normalizedBaseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Base salary amount must be greater than zero",
      });
    }

    if (!Number.isFinite(normalizedPaymentAmount) || normalizedPaymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Final salary amount must be greater than zero",
      });
    }

    // Teacher salary payouts are always expense transactions.
    const txnType = await AccountingType.findOne({ name: "Expense" });
    if (!txnType) {
      return res.status(400).json({
        success: false,
        message:
          "Expense accounting type is not configured. Please seed or recreate the default accounting types.",
      });
    }

    let method = null;
    if (txnType.name === "Income") {
      const activeMethods = await PaymentMethod.find({ isActive: true }).sort({
        isDefault: -1,
        name: 1,
      });
      method =
        activeMethods.find(
          (item) => String(item._id) === String(paymentMethodId || ""),
        ) ||
        activeMethods.find((item) => item.isDefault) ||
        activeMethods[0] ||
        null;

      if (!method) {
        return res.status(400).json({
          success: false,
          message:
            "No academy account is available for this payroll transaction. Please create Cash or Bank account first.",
        });
      }
    } else {
      const fundingSelection = await selectTeacherPayrollFundingMethod(
        paymentMethodId,
        normalizedPaymentAmount,
      );
      if (!fundingSelection.success) {
        return res.status(fundingSelection.statusCode || 400).json({
          success: false,
          message: fundingSelection.message,
        });
      }
      method = fundingSelection.method;
    }

    const teacher = await getTeacherByAnyId(id);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const selectedYear = Number(year) || new Date().getFullYear();
    const selectedMonth = Number(month) || new Date().getMonth() + 1;
    const payrollRecord = await TeacherPayroll.findOne({
      teacher: teacher._id,
      year: selectedYear,
      month: selectedMonth,
    });
    const salaryConfigOverride = getTeacherPayrollSalaryConfig(teacher, payrollRecord);
    const compensation = await calculateTeacherCompensationData(teacher, selectedYear, selectedMonth, {
      studentAdjustments: payrollRecord?.studentAdjustments || [],
      salaryConfigOverride,
      payrollAdjustments: {
        deductionAmount: payrollRecord?.deductionAmount || 0,
        deductionNote: payrollRecord?.deductionNote || "",
        bonusAmount: payrollRecord?.bonusAmount || 0,
        bonusNote: payrollRecord?.bonusNote || "",
      },
    });
    const baseDueAmount = Number(
      compensation.summary.finalMonthlySalary ||
        compensation.summary.calculatedMonthlySalary ||
        0,
    );
    const currentPaidAmount =
      payrollRecord?.isDeleted === true
        ? 0
        : Number(payrollRecord?.paidAmount || 0);
    const beforePaymentTotals = calculatePayrollTotals({
      baseDueAmount,
      carryForwardInAmount: 0,
      paidAmount: currentPaidAmount,
    });
    const availableBalance = Number(method.currentBalance || 0);

    if (txnType.name !== "Income" && availableBalance < normalizedPaymentAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance in ${method.name}. Available balance is PKR ${availableBalance.toLocaleString("en-PK")}, but PKR ${normalizedPaymentAmount.toLocaleString("en-PK")} is required to pay ${teacher.fullName}.`,
      });
    }

    let salaryHead = null;

    const requestedHeadId = headId || head || null;
    if (requestedHeadId) {
      salaryHead = await HeadOfAccount.findOne({
        _id: requestedHeadId,
        isActive: { $ne: false },
      });
    }

    if (!salaryHead) {
      salaryHead = await HeadOfAccount.findOne({
        name: { $regex: /^Salary$/i },
        type: txnType._id,
        isActive: { $ne: false },
      });
    }

    if (!salaryHead) {
      salaryHead = await HeadOfAccount.findOne({
        name: { $regex: /(salary|payroll|wages?)/i },
        type: txnType._id,
        isActive: { $ne: false },
      });
    }

    if (!salaryHead) {
      salaryHead = await HeadOfAccount.create({
        name: "Salary",
        type: txnType._id,
        description: "Auto-created default salary expense head",
        isActive: true,
      });
    }

    if (beforePaymentTotals.remainingAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: `${teacher.fullName} has no remaining salary due for ${compensation.month.displayLabel}.`,
      });
    }

    if (normalizedBaseAmount > beforePaymentTotals.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: `Base salary amount cannot exceed the remaining payroll balance of PKR ${beforePaymentTotals.remainingAmount.toLocaleString("en-PK")} for ${teacher.fullName}.`,
      });
    }

    if (normalizedDeductionAmount > normalizedBaseAmount) {
      return res.status(400).json({
        success: false,
        message: "Deduction amount cannot be greater than the base salary amount.",
      });
    }

    const paymentDetails = [
      details?.trim() || `Salary payout for ${compensation.month.displayLabel}`,
      normalizedDeductionAmount > 0
        ? `Deduction: PKR ${normalizedDeductionAmount.toLocaleString("en-PK")}${deductionNote ? ` (${String(deductionNote).trim()})` : ""}`
        : "",
      normalizedBonusAmount > 0
        ? `Bonus/Extra: PKR ${normalizedBonusAmount.toLocaleString("en-PK")}${bonusNote ? ` (${String(bonusNote).trim()})` : ""}`
        : "",
      `Base Salary: PKR ${normalizedBaseAmount.toLocaleString("en-PK")}`,
      `Final Paid: PKR ${normalizedPaymentAmount.toLocaleString("en-PK")}`,
    ]
      .filter(Boolean)
      .join("\n");

    const transactionNo = await generateTransactionNo();
    const txn = new AccountingTransaction({
      transactionNo,
      name: `Teacher salary payment — ${teacher.fullName}`,
      type: txnType._id,
      head: salaryHead._id,
      paymentMethod: method._id,
      paymentDate: new Date(paymentDate),
      amount: normalizedPaymentAmount,
      billReference: details?.trim() || `Salary payout for ${compensation.month.displayLabel}`,
      details: paymentDetails,
      createdBy: req.user?._id,
    });

    await txn.save();
    const balanceDirection = txnType.name === "Income" ? 1 : -1;
    await adjustBalance(method._id, normalizedPaymentAmount, balanceDirection);

    let updatedPayroll;
    if (!payrollRecord) {
      const afterPaymentTotals = calculatePayrollTotals({
        baseDueAmount,
        carryForwardInAmount: 0,
        paidAmount: normalizedPaymentAmount,
      });
      updatedPayroll = await TeacherPayroll.create({
        teacher: teacher._id,
        year: selectedYear,
        month: selectedMonth,
        salaryType: salaryConfigOverride.salaryType,
        monthlySalary: salaryConfigOverride.monthlySalary,
        salaryPerStudent: salaryConfigOverride.salaryPerStudent,
        attendanceThreshold: salaryConfigOverride.attendanceThreshold,
        totalActiveStudents: compensation.summary.totalActiveStudents,
        eligibleStudents: compensation.summary.eligibleStudents,
        baseDueAmount: afterPaymentTotals.baseDueAmount,
        carryForwardInAmount: afterPaymentTotals.carryForwardInAmount,
        carryForwardEligibleAmount: afterPaymentTotals.carryForwardEligibleAmount,
        dueAmount: afterPaymentTotals.totalDueAmount,
        paidAmount: afterPaymentTotals.paidAmount,
        remainingAmount: afterPaymentTotals.remainingAmount,
        overpaidAmount: afterPaymentTotals.overpaidAmount,
        status: afterPaymentTotals.status,
        paymentEntries: [
          {
            paymentDate: new Date(paymentDate),
            paymentMethod: method._id,
            paymentMethodName: method.name,
            amount: normalizedPaymentAmount,
            baseAmount: normalizedBaseAmount,
            deductionAmount: normalizedDeductionAmount,
            deductionNote: String(deductionNote || "").trim(),
            bonusAmount: normalizedBonusAmount,
            bonusNote: String(bonusNote || "").trim(),
            transactionId: txn._id,
            details: paymentDetails,
          },
        ],
      });
    } else {
      const afterPaymentTotals = calculatePayrollTotals({
        baseDueAmount,
        carryForwardInAmount: 0,
        paidAmount: currentPaidAmount + normalizedPaymentAmount,
      });

      payrollRecord.isDeleted = false;
      payrollRecord.salaryType = salaryConfigOverride.salaryType;
      payrollRecord.monthlySalary = salaryConfigOverride.monthlySalary;
      payrollRecord.salaryPerStudent = salaryConfigOverride.salaryPerStudent;
      payrollRecord.attendanceThreshold = salaryConfigOverride.attendanceThreshold;
      payrollRecord.totalActiveStudents = compensation.summary.totalActiveStudents;
      payrollRecord.eligibleStudents = compensation.summary.eligibleStudents;
      payrollRecord.baseDueAmount = afterPaymentTotals.baseDueAmount;
      payrollRecord.carryForwardInAmount = afterPaymentTotals.carryForwardInAmount;
      payrollRecord.carryForwardEligibleAmount =
        afterPaymentTotals.carryForwardEligibleAmount;
      payrollRecord.dueAmount = afterPaymentTotals.totalDueAmount;
      payrollRecord.paidAmount = afterPaymentTotals.paidAmount;
      payrollRecord.remainingAmount = afterPaymentTotals.remainingAmount;
      payrollRecord.overpaidAmount = afterPaymentTotals.overpaidAmount;
      payrollRecord.status = afterPaymentTotals.status;
      payrollRecord.paymentEntries.push({
        paymentDate: new Date(paymentDate),
        paymentMethod: method._id,
        paymentMethodName: method.name,
        amount: normalizedPaymentAmount,
        baseAmount: normalizedBaseAmount,
        deductionAmount: normalizedDeductionAmount,
        deductionNote: String(deductionNote || "").trim(),
        bonusAmount: normalizedBonusAmount,
        bonusNote: String(bonusNote || "").trim(),
        transactionId: txn._id,
        details: paymentDetails,
      });

      updatedPayroll = await payrollRecord.save();
    }

    res.status(200).json({
      success: true,
      data: updatedPayroll,
      transaction: txn,
      carryForwardSourceMonth: null,
      message: `Teacher salary recorded successfully in ${txnType.name} using ${method.name}.`,
    });
  } catch (error) {
    console.error("Error processing teacher payroll payment:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteTeacherPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId, year, month } = req.body || {};

    let payrollRecord = null;

    if (id && id !== "by-context") {
      payrollRecord = await TeacherPayroll.findById(id);
    }

    if (!payrollRecord && teacherId && year && month) {
      payrollRecord = await TeacherPayroll.findOne({
        teacher: teacherId,
        year: Number(year),
        month: Number(month),
      });
    }

    if (!payrollRecord) {
      if (!teacherId || !year || !month) {
        return res.status(404).json({
          success: false,
          message: "Payroll record not found",
        });
      }

      const hiddenRecord = await TeacherPayroll.create({
        teacher: teacherId,
        year: Number(year),
        month: Number(month),
        dueAmount: 0,
        remainingAmount: 0,
        paidAmount: 0,
        baseDueAmount: 0,
        carryForwardInAmount: 0,
        carryForwardEligibleAmount: 0,
        overpaidAmount: 0,
        totalActiveStudents: 0,
        eligibleStudents: 0,
        paymentEntries: [],
        isDeleted: true,
      });

      return res.status(200).json({
        success: true,
        data: hiddenRecord,
        message: "Payroll entry deleted successfully",
      });
    }

    const paymentEntries = Array.isArray(payrollRecord.paymentEntries)
      ? payrollRecord.paymentEntries
      : [];

    for (const entry of paymentEntries) {
      if (!entry?.transactionId) {
        continue;
      }

      const txn = await AccountingTransaction.findById(entry.transactionId);
      if (!txn) {
        continue;
      }

      const txnType = await AccountingType.findById(txn.type);
      const direction = txnType?.name === "Income" ? 1 : -1;

      await adjustBalance(
        txn.paymentMethod,
        Number(txn.amount || 0),
        -direction,
      );
      await AccountingTransaction.findByIdAndDelete(txn._id);
    }

    payrollRecord.paymentEntries = [];
    payrollRecord.paidAmount = 0;
    payrollRecord.baseDueAmount = 0;
    payrollRecord.carryForwardInAmount = 0;
    payrollRecord.carryForwardEligibleAmount = 0;
    payrollRecord.dueAmount = 0;
    payrollRecord.remainingAmount = 0;
    payrollRecord.overpaidAmount = 0;
    payrollRecord.status = "paid";
    payrollRecord.isDeleted = true;
    await payrollRecord.save();

    return res.status(200).json({
      success: true,
      message: "Payroll entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting teacher payroll:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getMonthlySummary = async (req, res) => {
  try {
    const balancesVisible = await canViewAccountingBalances(req);
    if (!balancesVisible) {
      return denyRestrictedAccountingAccess(res);
    }

    const months = parseInt(req.query.months) || 12;
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const [incomeType, expenseType] = await Promise.all([
      AccountingType.findOne({ name: "Income" }),
      AccountingType.findOne({ name: "Expense" }),
    ]);

    const [incomeAgg, expenseAgg] = await Promise.all([
      AccountingTransaction.aggregate([
        { $match: { type: incomeType?._id, paymentDate: { $gte: from } } },
        {
          $group: {
            _id: {
              year: { $year: "$paymentDate" },
              month: { $month: "$paymentDate" },
            },
            total: { $sum: "$amount" },
          },
        },
      ]),
      AccountingTransaction.aggregate([
        { $match: { type: expenseType?._id, paymentDate: { $gte: from } } },
        {
          $group: {
            _id: {
              year: { $year: "$paymentDate" },
              month: { $month: "$paymentDate" },
            },
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // Build a full month array so empty months show 0
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const result = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - (months - 1 - i),
        1,
      );
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const label = `${monthNames[mo - 1]} ${yr !== now.getFullYear() ? yr : ""}`;
      const income =
        incomeAgg.find((r) => r._id.year === yr && r._id.month === mo)?.total ||
        0;
      const expense =
        expenseAgg.find((r) => r._id.year === yr && r._id.month === mo)
          ?.total || 0;
      result.push({
        month: label.trim(),
        income,
        expense,
        net: income - expense,
      });
    }

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ============================================================
// RECEIPT / DUES TRACKING
// ============================================================

const normalizeDueStatus = (feeStructure) => {
  if ((feeStructure?.remainingAmount || 0) <= 0) return "Paid";
  if ((feeStructure?.paidAmount || 0) > 0) return "Partial";
  return "Pending";
};

const sortInstallmentsByDueDate = (installments = []) =>
  [...installments].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

const getDueDateMeta = (feeStructure) => {
  const installments = sortInstallmentsByDueDate(feeStructure?.installments || []);
  const payableInstallments = installments.filter((item) => item.status !== "Paid");
  const nextInstallment = payableInstallments[0] || null;
  const lastInstallment = installments[installments.length - 1] || null;
  const dueDate =
    nextInstallment?.dueDate ||
    lastInstallment?.dueDate ||
    feeStructure?.enrollment?.enrollmentDate ||
    feeStructure?.createdAt ||
    null;

  return {
    dueDate,
    nextInstallment,
    installments,
  };
};

const buildDueEntries = (feeStructure) => {
  const installments = sortInstallmentsByDueDate(feeStructure?.installments || []);

  if (installments.length) {
    return installments.map((installment) => {
      const amount = Number(installment.amount || 0);
      const paidAmount = Number(installment.paidAmount || 0);
      const remainingAmount = Math.max(0, amount - paidAmount);
      const status =
        remainingAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";

      return {
        dueEntryId: `${feeStructure._id}:${installment.installmentNumber}`,
        feeStructureId: feeStructure._id,
        installmentNumber: installment.installmentNumber,
        description:
          installment.description ||
          `Installment ${installment.installmentNumber}`,
        amount,
        paidAmount,
        remainingAmount,
        dueDate: installment.dueDate || null,
        status,
        receiptNo: installment.receiptNumber || null,
        voucherNo: installment.voucherNo || null,
        selectedInstallment: installment,
      };
    });
  }

  const totalFee = Number(feeStructure?.totalFee || 0);
  const paidAmount = Number(feeStructure?.paidAmount || 0);
  const remainingAmount = Math.max(0, totalFee - paidAmount);
  const status =
    remainingAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";

  return [
    {
      dueEntryId: `${feeStructure._id}:full`,
      feeStructureId: feeStructure._id,
      installmentNumber: null,
      description: "Full Fee",
      amount: totalFee,
      paidAmount,
      remainingAmount,
      dueDate:
        feeStructure?.enrollment?.enrollmentDate ||
        feeStructure?.createdAt ||
        null,
      status,
      receiptNo: null,
      voucherNo: null,
      selectedInstallment: null,
    },
  ];
};

// ============================================================
// EXPENSE HEAD ENTRIES
// ============================================================

export const getExpenseHeadEntries = async (req, res) => {
  try {
    const { payeeName = "", expenseCategory = "", paymentMethod = "" } = req.query;
    const filter = { isActive: true };

    if (payeeName.trim()) {
      filter.payeeName = { $regex: new RegExp(payeeName.trim(), "i") };
    }
    if (expenseCategory) {
      filter.expenseCategory = expenseCategory;
    }
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    const entries = await ExpenseHeadEntry.find(filter)
      .populate("expenseCategory", "name")
      .populate("paymentMethod", "name type")
      .populate("transactionId", "transactionNo")
      .sort({ date: -1, createdAt: -1 });

    const partyNames = await getSharedPartyNames();

    res.status(200).json({
      success: true,
      data: await Promise.all(entries.map(serializeExpenseHeadEntry)),
      meta: {
        nextVoucherNo: await getNextExpenseVoucherNo(),
        payeeNames: partyNames,
        partyNames,
      },
      message: "Expense head entries retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching expense head entries:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createExpenseHeadEntry = async (req, res) => {
  try {
    const {
      voucherNo,
      date,
      payeeName,
      paymentPurpose,
      expenseCategory,
      paymentMethod,
      chequeNoOrTransactionId,
      amount,
      amountInWords,
      description,
    } = req.body;

    if (
      !date ||
      !payeeName ||
      !paymentPurpose ||
      !expenseCategory ||
      !paymentMethod ||
      amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Voucher No, Date, Payee Name, Payment Purpose, Expense Category, Payment Method and Amount are required",
      });
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    const resolvedVoucherNo = String(
      voucherNo || (await getNextExpenseVoucherNo()),
    ).trim();

    const existingVoucher = await ExpenseHeadEntry.findOne({
      voucherNo: resolvedVoucherNo,
      date: new Date(date),
      isActive: true,
    });
    if (existingVoucher) {
      return res.status(409).json({
        success: false,
        message: "This voucher number already exists for the selected date",
      });
    }

    const selectedHead = await findHeadOfAccountByAnyId(expenseCategory);
    if (!selectedHead?._id) {
      return res.status(400).json({
        success: false,
        message: "Valid expense head is required",
      });
    }

    const selectedType = await findAccountingTypeByAnyId(
      selectedHead.type?._id || selectedHead.type,
    );
    if (!selectedType?._id) {
      return res.status(404).json({
        success: false,
        message: "Expense accounting type is not configured for this head",
      });
    }

    const method = await findPaymentMethodByAnyId(paymentMethod);
    if (!method) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    const availableBalance = Number(method.currentBalance || 0);
    if (availableBalance < normalizedAmount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance in ${method.name}. Available balance is PKR ${availableBalance.toLocaleString("en-PK")}.`,
      });
    }

    const transactionNo = await generateTransactionNo();
    const txn = await AccountingTransaction.create({
      transactionNo,
      name: `Expense Payment - ${payeeName.trim()}`,
      type: selectedType._id,
      head: selectedHead._id,
      paymentMethod: method._id,
      paymentDate: new Date(date),
      amount: normalizedAmount,
      billReference: voucherNo.trim(),
      details: buildExpenseEntryDetails({
        payeeName,
        paymentPurpose,
        paymentMethodName: method.name,
        voucherNo,
        chequeNoOrTransactionId,
        amountInWords,
        description,
      }),
      createdBy: req.user?._id || null,
    });

    await adjustBalance(method._id, normalizedAmount, -1);

    const entry = await ExpenseHeadEntry.create({
      voucherNo: resolvedVoucherNo,
      date: new Date(date),
      payeeName: payeeName.trim(),
      paymentPurpose: paymentPurpose.trim(),
      expenseCategory: selectedHead._id,
      paymentMethod: method._id,
      chequeNoOrTransactionId: chequeNoOrTransactionId?.trim() || "",
      amount: normalizedAmount,
      amountInWords: amountInWords?.trim() || "",
      description: description?.trim() || "",
      transactionId: txn._id,
      createdBy: req.user?._id || null,
      isActive: true,
    });

    const populatedEntry = await ExpenseHeadEntry.findById(entry._id)
      .populate("expenseCategory", "name")
      .populate("paymentMethod", "name type")
      .populate("transactionId", "transactionNo");

    res.status(201).json({
      success: true,
      data: await serializeExpenseHeadEntry(populatedEntry),
      message: "Expense head entry created successfully",
    });
  } catch (error) {
    console.error("Error creating expense head entry:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateExpenseHeadEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      voucherNo,
      date,
      payeeName,
      paymentPurpose,
      expenseCategory,
      paymentMethod,
      chequeNoOrTransactionId,
      amount,
      amountInWords,
      description,
    } = req.body;

    const entry = await ExpenseHeadEntry.findById(id);
    if (!entry || entry.isActive === false) {
      return res.status(404).json({
        success: false,
        message: "Expense head entry not found",
      });
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than zero",
      });
    }

    const selectedHead = await findHeadOfAccountByAnyId(expenseCategory);
    if (!selectedHead?._id) {
      return res.status(400).json({
        success: false,
        message: "Valid expense head is required",
      });
    }

    const selectedType = await findAccountingTypeByAnyId(
      selectedHead.type?._id || selectedHead.type,
    );
    if (!selectedType?._id) {
      return res.status(404).json({
        success: false,
        message: "Expense accounting type is not configured for this head",
      });
    }

    const method = await findPaymentMethodByAnyId(paymentMethod);
    if (!method) {
      return res.status(404).json({
        success: false,
        message: "Payment method not found",
      });
    }

    const duplicateVoucher = await ExpenseHeadEntry.findOne({
      _id: { $ne: id },
      voucherNo: String(voucherNo || "").trim(),
      date: new Date(date),
      isActive: true,
    });
    if (duplicateVoucher) {
      return res.status(409).json({
        success: false,
        message: "This voucher number already exists for the selected date",
      });
    }

    const existingTxn = entry.transactionId
      ? await AccountingTransaction.findById(entry.transactionId)
      : null;

    const oldMethodId = existingTxn?.paymentMethod || entry.paymentMethod;
    const oldAmount = Number(existingTxn?.amount ?? entry.amount ?? 0);

    if (oldMethodId && oldAmount > 0) {
      await adjustBalance(oldMethodId, oldAmount, 1);
    }

    const availableBalance = Number(method.currentBalance || 0);
    if (availableBalance < normalizedAmount) {
      if (oldMethodId && oldAmount > 0) {
        await adjustBalance(oldMethodId, oldAmount, -1);
      }
      return res.status(400).json({
        success: false,
        message: `Insufficient balance in ${method.name}. Available balance is PKR ${availableBalance.toLocaleString("en-PK")}.`,
      });
    }

    let txn = existingTxn;
    if (!txn) {
      txn = new AccountingTransaction({
        transactionNo: await generateTransactionNo(),
      });
    }

    txn.name = `Expense Payment - ${payeeName.trim()}`;
    txn.type = selectedType._id;
    txn.head = selectedHead._id;
    txn.paymentMethod = method._id;
    txn.paymentDate = new Date(date);
    txn.amount = normalizedAmount;
    txn.billReference = voucherNo.trim();
    txn.details = buildExpenseEntryDetails({
      payeeName,
      paymentPurpose,
      paymentMethodName: method.name,
      voucherNo,
      chequeNoOrTransactionId,
      amountInWords,
      description,
    });
    txn.createdBy = req.user?._id || txn.createdBy || null;
    await txn.save();

    await adjustBalance(method._id, normalizedAmount, -1);

    entry.voucherNo = String(voucherNo || "").trim();
    entry.date = new Date(date);
    entry.payeeName = payeeName.trim();
    entry.paymentPurpose = paymentPurpose.trim();
    entry.expenseCategory = selectedHead._id;
    entry.paymentMethod = method._id;
    entry.chequeNoOrTransactionId = chequeNoOrTransactionId?.trim() || "";
    entry.amount = normalizedAmount;
    entry.amountInWords = amountInWords?.trim() || "";
    entry.description = description?.trim() || "";
    entry.transactionId = txn._id;
    await entry.save();

    const populatedEntry = await ExpenseHeadEntry.findById(entry._id)
      .populate("expenseCategory", "name")
      .populate("paymentMethod", "name type")
      .populate("transactionId", "transactionNo");

    res.status(200).json({
      success: true,
      data: await serializeExpenseHeadEntry(populatedEntry),
      message: "Expense head entry updated successfully",
    });
  } catch (error) {
    console.error("Error updating expense head entry:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteExpenseHeadEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await ExpenseHeadEntry.findById(id);
    if (!entry || entry.isActive === false) {
      return res.status(404).json({
        success: false,
        message: "Expense head entry not found",
      });
    }

    const txn = entry.transactionId
      ? await AccountingTransaction.findById(entry.transactionId)
      : null;

    if (txn) {
      await adjustBalance(txn.paymentMethod, Number(txn.amount || 0), 1);
      await AccountingTransaction.findByIdAndDelete(txn._id);
    }

    entry.isActive = false;
    await entry.save();

    res.status(200).json({
      success: true,
      message: "Expense head entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense head entry:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const buildEntityMapById = (items = []) =>
  new Map(items.map((item) => [String(item?._id), item]));

const getIdVariants = async (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) {
    return [];
  }

  const mongoose = (await import("mongoose")).default;
  const variants = [rawValue];

  if (mongoose.Types.ObjectId.isValid(rawValue)) {
    variants.push(new mongoose.Types.ObjectId(rawValue));
  }

  return variants;
};

const syncFeeStructurePaymentStatus = (feeStructure) => {
  const totalFee = Number(feeStructure?.totalFee || 0);
  const paidAmount = Math.max(0, Number(feeStructure?.paidAmount || 0));
  feeStructure.paidAmount = paidAmount;
  feeStructure.remainingAmount = Math.max(0, totalFee - paidAmount);

  if (feeStructure.remainingAmount <= 0) {
    feeStructure.feeStatus = "Paid";
  } else if (feeStructure.paidAmount > 0) {
    feeStructure.feeStatus = "Partial";
  } else {
    feeStructure.feeStatus = "Unpaid";
  }
};

const syncInstallmentAfterRevert = async (feeStructure, payment) => {
  if (
    !payment?.installmentNumber ||
    !Array.isArray(feeStructure?.installments) ||
    !feeStructure.installments.length
  ) {
    return;
  }

  const targetInstallment = feeStructure.installments.find(
    (item) =>
      Number(item?.installmentNumber) === Number(payment.installmentNumber),
  );

  if (!targetInstallment) {
    return;
  }

  targetInstallment.paidAmount = Math.max(
    0,
    Number(targetInstallment.paidAmount || 0) - Number(payment.amount || 0),
  );

  const installmentTotal = Number(targetInstallment.amount || 0);
  if (targetInstallment.paidAmount <= 0) {
    targetInstallment.status = "Pending";
  } else if (targetInstallment.paidAmount >= installmentTotal) {
    targetInstallment.status = "Paid";
  } else {
    targetInstallment.status = "Partial";
  }

  const latestRemainingPayment = await FeePayment.findOne({
    _id: { $ne: payment._id },
    feeStructure: payment.feeStructure,
    installmentNumber: payment.installmentNumber,
    status: "Completed",
  })
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean();

  if (latestRemainingPayment) {
    targetInstallment.receiptNumber = latestRemainingPayment.receiptNo || "";
    targetInstallment.voucherNo = latestRemainingPayment.voucherNo || "";
    targetInstallment.paidDate = latestRemainingPayment.paymentDate || null;
  } else {
    targetInstallment.receiptNumber = "";
    targetInstallment.voucherNo = "";
    targetInstallment.paidDate = null;
  }
};

const buildRawRefFilter = async (fieldName, values = []) => {
  const variants = [];

  for (const value of values) {
    const currentVariants = await getIdVariants(value);
    for (const item of currentVariants) {
      const exists = variants.some(
        (variant) =>
          String(variant) === String(item) &&
          typeof variant === typeof item,
      );
      if (!exists) {
        variants.push(item);
      }
    }
  }

  if (!variants.length) {
    return null;
  }

  return { [fieldName]: { $in: variants } };
};

const getReceiptOverviewBaseData = async () => {
  const mongoose = (await import("mongoose")).default;
  const db = mongoose.connection.db;
  const enrollmentFilter = { status: "Active" };

  const activeEnrollments = await Enrollment.find(enrollmentFilter)
    .sort({ enrollmentDate: -1, createdAt: -1 })
    .lean();

  const studentFilter = await buildRawRefFilter(
    "_id",
    activeEnrollments.map((item) => item?.student),
  );
  const courseFilter = await buildRawRefFilter(
    "_id",
    activeEnrollments.map((item) => item?.course),
  );

  const [students, courses] = await Promise.all([
    studentFilter
      ? db
          .collection("admissions")
          .find(studentFilter, {
            projection: { registrationNo: 1, studentName: 1, mobileNumber: 1 },
          })
          .toArray()
      : [],
    courseFilter
      ? db
          .collection("courses")
          .find(courseFilter, {
            projection: { courseName: 1, courseId: 1 },
          })
          .toArray()
      : [],
  ]);

  const studentsById = buildEntityMapById(students);
  const coursesById = buildEntityMapById(courses);
  const latestEnrollmentByStudentCourse = new Map();
  const enrollmentsById = new Map();

  for (const enrollment of activeEnrollments) {
    const studentId = String(enrollment?.student?._id || enrollment?.student || "").trim();
    const courseIdValue = String(
      enrollment?.course?._id || enrollment?.course || "",
    ).trim();

    if (!studentId || !courseIdValue) {
      continue;
    }

    enrollmentsById.set(String(enrollment._id), {
      ...enrollment,
      student: studentsById.get(studentId) || null,
      course: coursesById.get(courseIdValue) || null,
    });

    const key = `${studentId}:${courseIdValue}`;
    if (!latestEnrollmentByStudentCourse.has(key)) {
      latestEnrollmentByStudentCourse.set(key, enrollment);
    }
  }

  const latestEnrollmentIds = Array.from(latestEnrollmentByStudentCourse.values()).map(
    (item) => item._id,
  );

  if (!latestEnrollmentIds.length) {
    return {
      rows: [],
      summary: {
        totalDues: 0,
        collected: 0,
        remaining: 0,
        studentCount: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
      },
    };
  }

  const enrollmentFilterQuery = await buildRawRefFilter(
    "enrollment",
    latestEnrollmentIds,
  );
  const enrolledFeeStructures = enrollmentFilterQuery
    ? await db
        .collection("feestructures")
        .find(enrollmentFilterQuery)
        .sort({ createdAt: -1 })
        .toArray()
    : [];

  const normalizedFeeStructures = enrolledFeeStructures
    .sort(
      (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime(),
    )
    .map((item) => ({
      ...item,
      student: studentsById.get(String(item.student || "")) || null,
      course: coursesById.get(String(item.course || "")) || null,
      enrollment: enrollmentsById.get(String(item.enrollment || "")) || null,
    }));

  const latestFeeStructureByEnrollment = new Map();
  for (const item of normalizedFeeStructures) {
    const enrollmentId = String(item.enrollment?._id || item.enrollment || "");
    if (!latestFeeStructureByEnrollment.has(enrollmentId)) {
      latestFeeStructureByEnrollment.set(enrollmentId, item);
    }
  }

  const filteredFeeStructures = Array.from(latestFeeStructureByEnrollment.values());
  const feeStructureIds = filteredFeeStructures.map((item) => item._id);

  const paymentFilterQuery = await buildRawRefFilter("feeStructure", feeStructureIds);
  const payments = paymentFilterQuery
    ? await db
        .collection("feepayments")
        .find(paymentFilterQuery, {
          projection: {
            feeStructure: 1,
            receiptNo: 1,
            voucherNo: 1,
            amount: 1,
            paymentDate: 1,
            paymentMethod: 1,
            accountingPaymentMethodId: 1,
            paymentType: 1,
            status: 1,
            createdAt: 1,
            installmentNumber: 1,
          },
        })
        .sort({ paymentDate: -1, createdAt: -1 })
        .toArray()
    : [];

  const paymentsByFeeStructure = payments.reduce((acc, payment) => {
    const key = String(payment.feeStructure);
    if (!acc[key]) acc[key] = [];
    acc[key].push(payment);
    return acc;
  }, {});

  const mappedRows = filteredFeeStructures
    .flatMap((item) => {
      const rowPayments = paymentsByFeeStructure[String(item._id)] || [];
      const latestPayment = rowPayments[0] || null;
      const latestPaymentMeta = latestPayment
        ? {
            _id: latestPayment._id,
            receiptNo: latestPayment.receiptNo,
            voucherNo: latestPayment.voucherNo,
            amount: latestPayment.amount || 0,
            paymentDate: latestPayment.paymentDate,
            paymentMethod: latestPayment.paymentMethod,
            accountingPaymentMethodId:
              latestPayment.accountingPaymentMethodId || null,
            paymentType: latestPayment.paymentType,
            status: latestPayment.status,
          }
        : null;

      return buildDueEntries(item).map((entry) => {
        const matchedPayment =
          rowPayments.find(
            (payment) =>
              (entry.receiptNo && payment.receiptNo === entry.receiptNo) ||
              (entry.installmentNumber &&
                payment.installmentNumber === entry.installmentNumber),
          ) || null;

        const paymentMethodLabel =
          matchedPayment?.paymentMethod ||
          latestPayment?.paymentMethod ||
          item?.latestPayment?.paymentMethod ||
          null;

        return {
          _id: entry.dueEntryId,
          feeStructureId: item._id,
          student: item.student,
          course: item.course,
          enrollment: item.enrollment,
          totalFee: item.totalFee || 0,
          amount: entry.amount,
          paidAmount: entry.paidAmount,
          remainingAmount: entry.remainingAmount,
          dueStatus: entry.status,
          feeStatus: item.feeStatus,
          installmentEnabled:
            Array.isArray(item.installments) && item.installments.length
              ? item.installments.length > 1
              : !!item.installmentEnabled,
          numberOfInstallments:
            Array.isArray(item.installments) && item.installments.length
              ? item.installments.length
              : item.numberOfInstallments || 1,
          dueDate: entry.dueDate,
          description: entry.description,
          installmentNumber: entry.installmentNumber,
          selectedInstallment: entry.selectedInstallment,
          installments: item.installments || [],
          receiptNo: entry.receiptNo,
          voucherNo: entry.voucherNo,
          paymentMethod: paymentMethodLabel,
          paymentMethodLabel: paymentMethodLabel,
          paymentId: matchedPayment?._id || latestPaymentMeta?._id || null,
          latestPayment: latestPaymentMeta,
          paymentCount: rowPayments.length,
        };
      });
    })
    .filter((row) => row.student?._id && row.course?._id && row.enrollment?._id);

  const paymentMethods = await PaymentMethod.find(
    { isActive: true },
    { name: 1, type: 1 },
  ).lean();
  const paymentMethodsById = new Map(
    paymentMethods.map((item) => [String(item._id || ""), item]),
  );
  const paymentMethodsByName = new Map(
    paymentMethods.map((item) => [
      String(item.name || "").trim().toLowerCase(),
      item,
    ]),
  );

  const resolveCollectedAccountType = (payment) => {
    const accountingMethodId = String(
      payment?.accountingPaymentMethodId || "",
    ).trim();
    if (accountingMethodId && paymentMethodsById.has(accountingMethodId)) {
      return paymentMethodsById.get(accountingMethodId)?.type || null;
    }

    const rawMethodName = String(payment?.paymentMethod || "")
      .trim()
      .toLowerCase();
    if (!rawMethodName) {
      return null;
    }

    if (paymentMethodsByName.has(rawMethodName)) {
      return paymentMethodsByName.get(rawMethodName)?.type || null;
    }

    if (rawMethodName.includes("cash")) return "cash";
    if (
      rawMethodName.includes("bank") ||
      rawMethodName.includes("cheque") ||
      rawMethodName.includes("online") ||
      rawMethodName.includes("transfer")
    ) {
      return "bank";
    }

    return null;
  };

  const collectionBreakdown = payments.reduce(
    (acc, payment) => {
      const paymentAmount = Number(payment?.amount || 0);
      const accountType = resolveCollectedAccountType(payment);

      if (accountType === "cash") {
        acc.cashCollected += paymentAmount;
      } else if (accountType === "bank") {
        acc.bankCollected += paymentAmount;
      } else {
        acc.unassignedCollected += paymentAmount;
      }

      return acc;
    },
    {
      cashCollected: 0,
      bankCollected: 0,
      unassignedCollected: 0,
    },
  );

  const summary = mappedRows.reduce(
    (acc, row) => {
      acc.totalDues += row.amount || 0;
      acc.collected += row.paidAmount || 0;
      acc.remaining += row.remainingAmount || 0;
      acc.studentCount += 1;
      if (row.dueStatus === "Paid") acc.paidCount += 1;
      if (row.dueStatus === "Partial") acc.partialCount += 1;
      if (row.dueStatus === "Pending") acc.pendingCount += 1;
      return acc;
    },
    {
      totalDues: 0,
      collected: 0,
      remaining: 0,
      studentCount: 0,
      paidCount: 0,
      partialCount: 0,
      pendingCount: 0,
      cashCollected: 0,
      bankCollected: 0,
      unassignedCollected: 0,
    },
  );

  summary.cashCollected = Number(collectionBreakdown.cashCollected || 0);
  summary.bankCollected = Number(collectionBreakdown.bankCollected || 0);
  summary.unassignedCollected = Number(
    collectionBreakdown.unassignedCollected || 0,
  );

  return {
    rows: mappedRows,
    summary,
  };
};

const getPreviousPayrollPeriod = (year, month) => {
  const baseDate = new Date(Number(year), Number(month) - 1, 1);
  const previous = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
  return {
    year: previous.getFullYear(),
    month: previous.getMonth() + 1,
  };
};

const deriveCarryForwardEligibleAmount = (payrollRecord) => {
  if (!payrollRecord) {
    return 0;
  }

  if (payrollRecord.carryForwardEligibleAmount !== undefined) {
    return Math.max(0, Number(payrollRecord.carryForwardEligibleAmount || 0));
  }

  const baseDueAmount = Math.max(
    0,
    Number(
      payrollRecord.baseDueAmount !== undefined
        ? payrollRecord.baseDueAmount
        : payrollRecord.dueAmount || 0,
    ),
  );
  const carryForwardInAmount = Math.max(
    0,
    Number(payrollRecord.carryForwardInAmount || 0),
  );
  const paidAmount = Math.max(0, Number(payrollRecord.paidAmount || 0));
  const appliedToCarry = Math.min(paidAmount, carryForwardInAmount);
  const appliedToCurrent = Math.min(
    baseDueAmount,
    Math.max(0, paidAmount - appliedToCarry),
  );

  return Math.max(0, baseDueAmount - appliedToCurrent);
};

const calculatePayrollTotals = ({
  baseDueAmount,
  carryForwardInAmount,
  paidAmount,
}) => {
  const normalizedBaseDueAmount = Math.max(0, Number(baseDueAmount || 0));
  const normalizedCarryForwardInAmount = Math.max(
    0,
    Number(carryForwardInAmount || 0),
  );
  const normalizedPaidAmount = Math.max(0, Number(paidAmount || 0));
  const totalDueAmount = normalizedBaseDueAmount + normalizedCarryForwardInAmount;
  const appliedToCarry = Math.min(
    normalizedPaidAmount,
    normalizedCarryForwardInAmount,
  );
  const appliedToCurrent = Math.min(
    normalizedBaseDueAmount,
    Math.max(0, normalizedPaidAmount - appliedToCarry),
  );
  const carryForwardEligibleAmount = Math.max(
    0,
    normalizedBaseDueAmount - appliedToCurrent,
  );
  const remainingAmount = Math.max(0, totalDueAmount - normalizedPaidAmount);
  const overpaidAmount = Math.max(0, normalizedPaidAmount - totalDueAmount);
  const status =
    totalDueAmount <= 0
      ? "paid"
      : normalizedPaidAmount >= totalDueAmount
      ? "paid"
      : normalizedPaidAmount > 0
      ? "partial"
      : "unpaid";

  return {
    baseDueAmount: normalizedBaseDueAmount,
    carryForwardInAmount: normalizedCarryForwardInAmount,
    totalDueAmount,
    paidAmount: normalizedPaidAmount,
    appliedToCarry,
    appliedToCurrent,
    carryForwardEligibleAmount,
    remainingAmount,
    overpaidAmount,
    status,
  };
};

const getTeacherCarryForwardAmount = async (teacherId, year, month) => {
  const previousPeriod = getPreviousPayrollPeriod(year, month);
  const previousPayrollRecord = await TeacherPayroll.findOne({
    teacher: teacherId,
    year: previousPeriod.year,
    month: previousPeriod.month,
    isDeleted: { $ne: true },
  }).lean();

  return {
    previousPeriod,
    previousPayrollRecord,
    carryForwardInAmount: deriveCarryForwardEligibleAmount(previousPayrollRecord),
  };
};

const getTeacherByAnyId = async (teacherId) => {
  const normalizedTeacherId = String(teacherId || "").trim();
  if (!normalizedTeacherId) {
    return null;
  }

  const directTeacher = await TeacherSchema.findById(normalizedTeacherId)
    .populate("courseId", "courseName courseId");
  if (directTeacher) {
    return directTeacher;
  }

  const mongoose = (await import("mongoose")).default;
  const db = mongoose.connection.db;
  const rawTeacher = await db
    .collection("teachers")
    .findOne({ _id: normalizedTeacherId });

  if (!rawTeacher) {
    return null;
  }

  const rawCourseIds = Array.isArray(rawTeacher.courseId)
    ? rawTeacher.courseId.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const rawCourses = rawCourseIds.length
    ? await db
        .collection("courses")
        .find(
          { _id: { $in: rawCourseIds } },
          { projection: { courseName: 1, courseId: 1 } },
        )
        .toArray()
    : [];

  return {
    ...rawTeacher,
    courseId: rawCourses,
  };
};

// GET /accounting/receipts/dues
export const getReceiptDuesOverview = async (req, res) => {
  try {
    const {
      status,
      courseId,
      search = "",
      dueDateFrom,
      dueDateTo,
      sortOrder = "asc",
      page = 1,
      limit = 50,
      paymentMethod = "all",
    } = req.query;

    const { rows: allRows } = await getReceiptOverviewBaseData();

    if (!allRows.length) {
      return res.status(200).json({
        success: true,
        data: [],
        summary: {
          totalDues: 0,
          collected: 0,
          remaining: 0,
          studentCount: 0,
          paidCount: 0,
          partialCount: 0,
          pendingCount: 0,
          cashCollected: 0,
          bankCollected: 0,
          unassignedCollected: 0,
        },
        pagination: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          pages: 0,
        },
        message: "Receipt dues overview retrieved successfully",
      });
    }

    const searchValue = search.trim().toLowerCase();
    let filteredRows = allRows.filter((row) => {
      const normalizedStatus = String(status || "").trim().toLowerCase();
      if (normalizedStatus) {
        if (normalizedStatus === "unpaid" && row.remainingAmount <= 0) {
          return false;
        }
        if (
          normalizedStatus !== "unpaid" &&
          normalizedStatus !== "all" &&
          row.dueStatus.toLowerCase() !== normalizedStatus
        ) {
          return false;
        }
      }

      if (courseId && String(row.course?._id || "") !== String(courseId)) {
        return false;
      }

      const rowDueDate = row.dueDate ? new Date(row.dueDate) : null;
      if (dueDateFrom && rowDueDate && rowDueDate < new Date(dueDateFrom)) {
        return false;
      }
      if (dueDateFrom && !rowDueDate) return false;
      if (dueDateTo && rowDueDate) {
        const endDate = new Date(dueDateTo);
        endDate.setHours(23, 59, 59, 999);
        if (rowDueDate > endDate) return false;
      }
      if (dueDateTo && !rowDueDate) return false;

      const normalizedPaymentMethod = String(
        paymentMethod || "all",
      ).trim().toLowerCase();
      if (normalizedPaymentMethod && normalizedPaymentMethod !== "all") {
        const paymentMethodLabel = String(
          row.paymentMethod || row.latestPayment?.paymentMethod || "",
        )
          .trim()
          .toLowerCase();

        if (normalizedPaymentMethod === "other") {
          const isCustomOther =
            !!paymentMethodLabel &&
            paymentMethodLabel !== "cash" &&
            paymentMethodLabel !== "bank" &&
            !paymentMethodLabel.includes("online") &&
            !paymentMethodLabel.includes("cheque");

          if (!isCustomOther) return false;
        } else if (!paymentMethodLabel.includes(normalizedPaymentMethod)) {
          return false;
        }
      }

      if (!searchValue) return true;

      return [
        row.student?.studentName,
        row.student?._id,
        row.student?.registrationNo,
        row.student?.mobileNumber,
        row.enrollment?._id,
        row.course?.courseName,
        row.course?.courseId,
        row.description,
        row.receiptNo,
        row.voucherNo,
        row.latestPayment?.receiptNo,
        row.latestPayment?.voucherNo,
        row.paymentMethod,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue));
    });

    filteredRows.sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return String(sortOrder).toLowerCase() === "desc" ? bDate - aDate : aDate - bDate;
    });

    const summary = filteredRows.reduce(
      (acc, row) => {
        acc.totalDues += row.amount || 0;
        acc.collected += row.paidAmount || 0;
        acc.remaining += row.remainingAmount || 0;
        acc.studentCount += 1;
        if (row.dueStatus === "Paid") acc.paidCount += 1;
        if (row.dueStatus === "Partial") acc.partialCount += 1;
        if (row.dueStatus === "Pending") acc.pendingCount += 1;
        return acc;
      },
      {
        totalDues: 0,
        collected: 0,
        remaining: 0,
        studentCount: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
      },
    );

    const parsedPage = Math.max(1, Number(page) || 1);
    const parsedLimit = Math.max(1, Number(limit) || 50);
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginatedRows = filteredRows.slice(startIndex, startIndex + parsedLimit);

    res.status(200).json({
      success: true,
      data: paginatedRows,
      summary,
      pagination: {
        total: filteredRows.length,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(filteredRows.length / parsedLimit),
      },
      message: "Receipt dues overview retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching receipt dues overview:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /accounting/receipts/dues/export — Export receipt dues to PDF
export const exportReceiptDues = async (req, res) => {
  try {
    const {
      status,
      courseId,
      search = "",
      dueDateFrom,
      dueDateTo,
      sortOrder = "asc",
      exportType = "all", // all, paid, partial, pending
      format = "pdf",
    } = req.query;

    const enrollmentFilter = { status: "Active" };
    if (courseId) enrollmentFilter.course = courseId;

    const activeEnrollments = await Enrollment.find(enrollmentFilter)
      .populate("student", "registrationNo studentName mobileNumber")
      .populate("course", "courseName courseId")
      .sort({ enrollmentDate: -1, createdAt: -1 })
      .lean();

    const latestEnrollmentByStudentCourse = new Map();
    for (const enrollment of activeEnrollments) {
      const studentId = String(enrollment.student?._id || enrollment.student || "");
      const courseIdValue = String(
        enrollment.course?._id || enrollment.course || "",
      );

      if (!studentId || !courseIdValue) {
        continue;
      }

      const key = `${studentId}:${courseIdValue}`;
      if (!latestEnrollmentByStudentCourse.has(key)) {
        latestEnrollmentByStudentCourse.set(key, enrollment);
      }
    }

    const enrolledFeeStructures = await FeeStructure.find({
      enrollment: {
        $in: Array.from(latestEnrollmentByStudentCourse.values()).map(
          (item) => item._id,
        ),
      },
    })
      .populate("student", "registrationNo studentName mobileNumber")
      .populate("course", "courseName courseId")
      .populate("enrollment", "status enrollmentDate")
      .sort({ createdAt: -1 })
      .lean();

    const normalizedFormat = String(format || "pdf").trim().toLowerCase();

    if (!enrolledFeeStructures.length) {
      if (normalizedFormat === "excel" || normalizedFormat === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet([]),
          "Receipt Dues",
        );
        const emptyBuffer = XLSX.write(workbook, {
          type: "buffer",
          bookType: "xlsx",
        });
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=receipt-dues-empty.xlsx",
        );
        return res.send(emptyBuffer);
      }

      const doc = new PDFKit({ margin: 50 });
      doc.fontSize(16).text("No data found", { align: "center" });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const result = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=receipt-dues.pdf");
        res.send(result);
      });
      doc.end();
      return;
    }

    const latestFeeStructureByEnrollment = new Map();
    for (const item of enrolledFeeStructures) {
      const enrollmentId = String(item.enrollment?._id || item.enrollment);
      if (!latestFeeStructureByEnrollment.has(enrollmentId)) {
        latestFeeStructureByEnrollment.set(enrollmentId, item);
      }
    }

    const filteredFeeStructures = Array.from(latestFeeStructureByEnrollment.values());
    const feeStructureIds = filteredFeeStructures.map((item) => item._id);

    const payments = await FeePayment.find({
      feeStructure: { $in: feeStructureIds },
    })
      .select(
        "feeStructure receiptNo voucherNo amount paymentDate paymentMethod paymentType status createdAt installmentNumber",
      )
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    const paymentsByFeeStructure = payments.reduce((acc, payment) => {
      const key = String(payment.feeStructure);
      if (!acc[key]) acc[key] = [];
      acc[key].push(payment);
      return acc;
    }, {});

    const normalizeDueStatus = (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (normalized === "paid") return "Paid";
      if (normalized === "partial") return "Partial";
      return "Pending";
    };

    const mappedRows = filteredFeeStructures.flatMap((item) => {
      const rowPayments = paymentsByFeeStructure[String(item._id)] || [];
      const latestPayment = rowPayments[0] || null;
      const latestPaymentMeta = latestPayment
        ? {
            _id: latestPayment._id,
            receiptNo: latestPayment.receiptNo,
            voucherNo: latestPayment.voucherNo,
            amount: latestPayment.amount || 0,
            paymentDate: latestPayment.paymentDate,
            paymentMethod: latestPayment.paymentMethod,
            paymentType: latestPayment.paymentType,
            status: latestPayment.status,
          }
        : null;

      return buildDueEntries(item).map((entry) => {
        const matchedPayment =
          rowPayments.find(
            (payment) =>
              (entry.receiptNo && payment.receiptNo === entry.receiptNo) ||
              (entry.installmentNumber &&
                payment.installmentNumber === entry.installmentNumber),
          ) || null;

        return {
          _id: entry.dueEntryId,
          feeStructureId: item._id,
          student: item.student,
          course: item.course,
          enrollment: item.enrollment,
          totalFee: item.totalFee || 0,
          amount: entry.amount,
          paidAmount: entry.paidAmount,
          remainingAmount: entry.remainingAmount,
          dueStatus: normalizeDueStatus(entry.status),
          feeStatus: item.feeStatus,
          installmentEnabled:
            Array.isArray(item.installments) && item.installments.length
              ? item.installments.length > 1
              : !!item.installmentEnabled,
          numberOfInstallments:
            Array.isArray(item.installments) && item.installments.length
              ? item.installments.length
              : item.numberOfInstallments || 1,
          dueDate: entry.dueDate,
          description: entry.description,
          installmentNumber: entry.installmentNumber,
          selectedInstallment: entry.selectedInstallment,
          installments: item.installments || [],
          receiptNo: entry.receiptNo,
          voucherNo: entry.voucherNo,
          paymentId: matchedPayment?._id || latestPaymentMeta?._id || null,
          latestPayment: latestPaymentMeta,
          paymentCount: rowPayments.length,
        };
      });
    }).filter(
      (row) =>
        row.student?._id &&
        row.course?._id &&
        row.enrollment,
    );

    const searchValue = search.trim().toLowerCase();
    let filteredRows = mappedRows.filter((row) => {
      const normalizedStatus = String(status || "").trim().toLowerCase();
      const rowStatus = String(row.dueStatus || "").trim().toLowerCase();
      if (normalizedStatus) {
        if (normalizedStatus === "unpaid" && row.remainingAmount <= 0) {
          return false;
        }
        if (
          normalizedStatus !== "unpaid" &&
          normalizedStatus !== "all" &&
          rowStatus !== normalizedStatus
        ) {
          return false;
        }
      }

      const rowDueDate = row.dueDate ? new Date(row.dueDate) : null;
      if (dueDateFrom && rowDueDate && rowDueDate < new Date(dueDateFrom)) {
        return false;
      }
      if (dueDateFrom && !rowDueDate) return false;
      if (dueDateTo && rowDueDate) {
        const endDate = new Date(dueDateTo);
        endDate.setHours(23, 59, 59, 999);
        if (rowDueDate > endDate) return false;
      }
      if (dueDateTo && !rowDueDate) return false;

      if (!searchValue) return true;

      return [
        row.student?.studentName,
        row.student?.registrationNo,
        row.student?.mobileNumber,
        row.course?.courseName,
        row.course?.courseId,
        row.description,
        row.receiptNo,
        row.voucherNo,
        row.latestPayment?.receiptNo,
        row.latestPayment?.voucherNo,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchValue));
    });

    // Apply export type filter
    if (exportType && exportType !== "all") {
      const normalizedExportType = String(exportType).trim().toLowerCase();
      filteredRows = filteredRows.filter(
        (row) => String(row.dueStatus || "").trim().toLowerCase() === normalizedExportType,
      );
    }

    filteredRows.sort((a, b) => {
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return String(sortOrder).toLowerCase() === "desc" ? bDate - aDate : aDate - bDate;
    });

    // Calculate summary
    const summary = filteredRows.reduce(
      (acc, row) => {
        acc.totalDues += row.amount || 0;
        acc.collected += row.paidAmount || 0;
        acc.remaining += row.remainingAmount || 0;
        acc.studentCount += 1;
        if (row.dueStatus === "Paid") acc.paidCount += 1;
        if (row.dueStatus === "Partial") acc.partialCount += 1;
        if (row.dueStatus === "Pending") acc.pendingCount += 1;
        return acc;
      },
      {
        totalDues: 0,
        collected: 0,
        remaining: 0,
        studentCount: 0,
        paidCount: 0,
        partialCount: 0,
        pendingCount: 0,
      },
    );

    const appSettings = (await AppSettings.findOne().lean()) || {};
    const normalizePdfColor = (value, fallback) => {
      const normalized = String(value || "").trim();
      return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)
        ? normalized
        : fallback;
    };
    const normalizePdfFont = (value) => {
      const normalized = String(value || "").trim().toLowerCase();
      if (!normalized) return "Helvetica";
      const supportedFonts = {
        helvetica: "Helvetica",
        "times new roman": "Times-Roman",
        "times-roman": "Times-Roman",
        times: "Times-Roman",
        courier: "Courier",
      };
      return supportedFonts[normalized] || "Helvetica";
    };
    const normalizePdfPageSize = (value) => {
      const normalized = String(value || "").trim().toUpperCase();
      if (normalized === "A4") return "A4";
      if (normalized === "LETTER") return "LETTER";
      if (normalized === "LEGAL") return "LEGAL";
      return "A4";
    };
    const sanitizePdfText = (value, fallback = "-") => {
      const raw = String(value ?? "").trim();
      if (!raw) return fallback;
      return raw
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "")
        .replace(/\s+/g, " ")
        .trim() || fallback;
    };
    const safeCurrency = (value) =>
      Number(value || 0).toLocaleString("en-PK");
    const safeDate = (value) => {
      const parsed = value ? new Date(value) : null;
      return parsed && !Number.isNaN(parsed.getTime())
        ? parsed.toLocaleDateString("en-GB")
        : "-";
    };

    const primaryColor = normalizePdfColor(
      appSettings.pdfPrimaryColor || appSettings.themeColor,
      "#142D78",
    );
    const accentColor = normalizePdfColor(appSettings.accentColor, "#f59e0b");
    const schoolName = sanitizePdfText(
      appSettings.schoolName,
      "ODYSSEY ACADEMY KHIPRO",
    );
    const headerText = sanitizePdfText(
      appSettings.pdfHeaderText,
      "Student Receipt Dues Report",
    );
    const schoolAddress = sanitizePdfText(
      appSettings.address,
      "Bin Muqarab Colony Main 7G Road, Khipro",
    );
    const schoolEmail = sanitizePdfText(
      appSettings.email,
      "askodysseyacademy@gmail.com",
    );
    const schoolPhone = sanitizePdfText(
      appSettings.phone,
      "+923492425428",
    );
    const fontFamily = normalizePdfFont(appSettings.pdfFontFamily);
    const pageSize = normalizePdfPageSize(appSettings.pdfPageSize);
    const lightGray = "#f8fafc";
    const headerCard = "#eaf2fb";
    const borderColor = "#dbe5f1";
    const darkGray = "#334155";

    const resolveAssetPath = (relativePath = "") => {
      if (!relativePath) return null;
      const rawPath = String(relativePath).trim();
      if (!rawPath || /^https?:\/\//i.test(rawPath)) return null;

      const cleanPath = rawPath.split("?")[0].replace(/^\/+/, "");
      const candidatePaths = [
        path.resolve(process.cwd(), cleanPath),
        path.resolve(process.cwd(), "backend", cleanPath),
        path.resolve(process.cwd(), "public", cleanPath.replace(/^public[\\/]/, "")),
      ];

      return candidatePaths.find((candidate) => fs.existsSync(candidate)) || null;
    };

    const logoPath =
      resolveAssetPath(appSettings.pdfLogo) ||
      resolveAssetPath(appSettings.logo) ||
      resolveAssetPath("public/assets/LOGO-gGjlK6W5.png");

    if (normalizedFormat === "excel" || normalizedFormat === "xlsx") {
      const exportRows = filteredRows.map((row, index) => ({
        "Sr. No": index + 1,
        "Registration No": row.student?.registrationNo || "",
        "Student Name": row.student?.studentName || "",
        "Mobile Number": row.student?.mobileNumber || "",
        Course: row.course?.courseName || "",
        "Course ID": row.course?.courseId || "",
        Description: row.description || "",
        "Installment No": row.installmentNumber || "",
        "Due Date": row.dueDate ? new Date(row.dueDate) : "",
        Amount: Number(row.amount || 0),
        Paid: Number(row.paidAmount || 0),
        Remaining: Number(row.remainingAmount || 0),
        Status: row.dueStatus || "",
        "Receipt No": row.receiptNo || row.latestPayment?.receiptNo || "",
        "Voucher No": row.voucherNo || row.latestPayment?.voucherNo || "",
        "Payment Count": Number(row.paymentCount || 0),
      }));

      const summaryRows = [
        { Metric: "Export Type", Value: exportType },
        { Metric: "Format", Value: "Excel" },
        { Metric: "Status Filter", Value: status || "All" },
        { Metric: "Course Filter", Value: courseId || "All" },
        { Metric: "Search", Value: search || "-" },
        {
          Metric: "Due Date Range",
          Value:
            dueDateFrom || dueDateTo
              ? `${safeDate(dueDateFrom)} - ${safeDate(dueDateTo)}`
              : "All",
        },
        { Metric: "Sort Order", Value: sortOrder || "asc" },
        { Metric: "Total Dues", Value: Number(summary.totalDues || 0) },
        { Metric: "Collected", Value: Number(summary.collected || 0) },
        { Metric: "Remaining", Value: Number(summary.remaining || 0) },
        { Metric: "Total Entries", Value: Number(summary.studentCount || 0) },
        { Metric: "Paid Entries", Value: Number(summary.paidCount || 0) },
        { Metric: "Partial Entries", Value: Number(summary.partialCount || 0) },
        { Metric: "Pending Entries", Value: Number(summary.pendingCount || 0) },
      ];

      const workbook = XLSX.utils.book_new();
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      const detailsSheet = XLSX.utils.json_to_sheet(exportRows);

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, detailsSheet, "Receipt Dues");

      const workbookBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=receipt-dues-${exportType}-${new Date()
          .toISOString()
          .split("T")[0]}.xlsx`,
      );
      return res.send(workbookBuffer);
    }

    const doc = new PDFKit({ margin: 40, size: pageSize });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", (pdfError) => {
      console.error("Receipt PDF stream error:", pdfError);
    });

    const generatedLabel = sanitizePdfText(new Date().toLocaleString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }), "Generated");

    const drawHeader = (pageNum = 1) => {
      const cardX = 40;
      const cardY = 20;
      const cardWidth = doc.page.width - 80;
      const cardHeight = 92;

      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 8).fill(headerCard);

      if (logoPath && fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, 58, 34, {
            fit: [42, 42],
            align: "left",
            valign: "center",
          });
        } catch (error) {
          console.warn("Unable to render receipt report logo:", error.message);
        }
      }

      doc.fillColor("#ffffff")
        .font("Helvetica-Bold");

      doc.fillColor(primaryColor)
        .font("Helvetica-Bold")
        .fontSize(18)
        .text(schoolName, 128, 44, {
          width: doc.page.width - 250,
        });

      doc.font(fontFamily)
        .fontSize(10)
        .fillColor("#475569")
        .text(schoolAddress, 128, 70, {
          width: doc.page.width - 250,
        });

      doc.fillColor("#64748b")
        .font(fontFamily)
        .fontSize(9)
        .text(schoolEmail, 128, 90, {
          width: 170,
          lineBreak: false,
        });

      doc.fillColor(accentColor)
        .rect(304, 94, 6, 6)
        .fill();

      doc.fillColor("#64748b")
        .font(fontFamily)
        .fontSize(9)
        .text(schoolPhone, 320, 90, {
          width: 110,
          lineBreak: false,
        });

      doc.fillColor(darkGray)
        .font(fontFamily)
        .fontSize(8)
        .text(`Generated: ${generatedLabel} | Page ${pageNum}`, doc.page.width - 210, 92, {
          width: 160,
          align: "right",
          lineBreak: false,
        });

      doc.fillColor(primaryColor)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(headerText, 40, 126, {
          width: doc.page.width - 80,
        });

      doc.fillColor(accentColor)
        .rect(40, 144, doc.page.width - 80, 2.5)
        .fill();

      return 160;
    };

    const drawTableHeader = (tableTop) => {
      doc.save();
      doc.roundedRect(40, tableTop, doc.page.width - 80, 24, 4).fill(primaryColor);

      let headerX = 47;
      doc.fillColor("#ffffff").fontSize(8.5).font("Helvetica-Bold");
      tableHeaders.forEach((header) => {
        doc.text(header.label, headerX, tableTop + 7, {
          width: header.width - 6,
          align: header.align === "right" ? "right" : "left",
          lineBreak: false,
        });
        headerX += header.width;
      });
      doc.restore();
    };

    let contentTop = drawHeader();

    // Summary Box
    const boxTop = contentTop + 10;
    doc.roundedRect(40, boxTop, doc.page.width - 80, 92, 6).fillAndStroke(lightGray, borderColor);

    doc.fillColor(primaryColor)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Financial Summary", 50, boxTop + 8);
    
    // Summary items in two columns
    doc.fontSize(10).font(fontFamily).fillColor(darkGray);
    const summaryLeft = 50;
    const summaryRight = 220;
    let summaryY = boxTop + 28;
    
    // Left column
    doc.text(`Total Dues:`, summaryLeft, summaryY);
    doc.font("Helvetica-Bold").text(`Rs ${summary.totalDues.toLocaleString("en-PK")}`, summaryLeft + 70, summaryY);
    doc.font(fontFamily).fillColor(darkGray);
    
    doc.text(`Collected:`, summaryLeft, summaryY + 14);
    doc.font("Helvetica-Bold").fillColor("#059669").text(`Rs ${summary.collected.toLocaleString("en-PK")}`, summaryLeft + 70, summaryY + 14);
    doc.font(fontFamily).fillColor(darkGray);
    
    doc.text(`Remaining:`, summaryLeft, summaryY + 28);
    doc.font("Helvetica-Bold").fillColor("#dc2626").text(`Rs ${summary.remaining.toLocaleString("en-PK")}`, summaryLeft + 70, summaryY + 28);
    
    // Right column
    doc.fillColor(darkGray).font(fontFamily);
    doc.text(`Total Entries:`, summaryRight, summaryY);
    doc.font("Helvetica-Bold").text(`${summary.studentCount}`, summaryRight + 75, summaryY);
    
    doc.font(fontFamily);
    doc.text(`Paid:`, summaryRight, summaryY + 14);
    doc.font("Helvetica-Bold").fillColor("#059669").text(`${summary.paidCount}`, summaryRight + 75, summaryY + 14);
    
    doc.font(fontFamily).fillColor(darkGray);
    doc.text(`Partial:`, summaryRight, summaryY + 28);
    doc.font("Helvetica-Bold").fillColor("#2563eb").text(`${summary.partialCount}`, summaryRight + 75, summaryY + 28);
    
    doc.font(fontFamily).fillColor(darkGray);
    doc.text(`Pending:`, summaryRight + 100, summaryY + 28);
    doc.font("Helvetica-Bold").fillColor("#d97706").text(`${summary.pendingCount}`, summaryRight + 175, summaryY + 28);
    
    // Filters info
    doc.fillColor(darkGray).font(fontFamily).fontSize(8);
    let filterY = boxTop + 70;
    doc.text(
      sanitizePdfText(
        `Filter: ${status || "All Status"} | Course: ${courseId || "All"} | Export: ${exportType}`,
        "Filter: All",
      ),
      50,
      filterY,
    );
    if (dueDateFrom && dueDateTo) {
      doc.text(
        sanitizePdfText(
          `Date Range: ${safeDate(dueDateFrom)} - ${safeDate(dueDateTo)}`,
          "Date Range",
        ),
        300,
        filterY,
      );
    }

    contentTop = boxTop + 112;

    // Table
    const tableHeaders = [
      { label: "Sr.", width: 30 },
      { label: "Reg. No", width: 55 },
      { label: "Student Name", width: 90 },
      { label: "Course", width: 75 },
      { label: "Amount", width: 60, align: "right" },
      { label: "Paid", width: 60, align: "right" },
      { label: "Remaining", width: 65, align: "right" },
      { label: "Status", width: 50 },
    ];

    drawTableHeader(contentTop);

    // Draw data rows
    let rowY = contentTop + 28;
    const rowHeight = 19;
    const pageHeight = doc.page.height - 40;
    let pageNum = 1;

    const skippedRows = [];

    filteredRows.forEach((row, index) => {
      try {
      // Check if we need a new page
        if (rowY + rowHeight > pageHeight) {
          doc.addPage();
          pageNum++;

          contentTop = drawHeader(pageNum);
          drawTableHeader(contentTop);
          rowY = contentTop + 28;
        }

        if (index % 2 === 0) {
          doc.rect(40, rowY, doc.page.width - 80, rowHeight).fill("#f8fafc");
        }

        doc.strokeColor(borderColor)
          .lineWidth(0.4)
          .moveTo(40, rowY + rowHeight)
          .lineTo(doc.page.width - 40, rowY + rowHeight)
          .stroke();

        doc.fillColor(darkGray).fontSize(8).font(fontFamily);
        let dataX = 47;
        const normalizedRowStatus = normalizeDueStatus(row.dueStatus);
        const rowData = [
          String(index + 1),
          sanitizePdfText(row.student?.registrationNo, "-"),
          sanitizePdfText(row.student?.studentName, "-").substring(0, 18),
          sanitizePdfText(row.course?.courseName, "-").substring(0, 14),
          safeCurrency(row.amount || 0),
          safeCurrency(row.paidAmount || 0),
          safeCurrency(row.remainingAmount || 0),
          normalizedRowStatus,
        ];

        tableHeaders.forEach((h, i) => {
          const value = rowData[i];
          doc.fillColor(darkGray);
          doc.text(value, dataX, rowY + 5, {
            width: h.width - 6,
            align: h.align === "right" ? "right" : "left",
            lineBreak: false,
          });
          dataX += h.width;
        });

        if (normalizedRowStatus === "Paid") {
          doc.fillColor("#059669");
        } else if (normalizedRowStatus === "Partial") {
          doc.fillColor("#2563eb");
        } else {
          doc.fillColor("#d97706");
        }
        doc.font("Helvetica-Bold").text(normalizedRowStatus, dataX - 50, rowY + 5, {
          width: 44,
          lineBreak: false,
        });
        doc.font(fontFamily);

        rowY += rowHeight;
      } catch (rowError) {
        skippedRows.push({
          index,
          feeStructureId: String(row.feeStructureId || ""),
          student: row.student?.studentName || "",
          course: row.course?.courseName || "",
          message: rowError.message,
        });
      }
    });

    if (skippedRows.length) {
      console.error("Skipped receipt export rows:", skippedRows.slice(0, 10));
    }

    if (rowY + 20 > pageHeight) {
      doc.addPage();
      pageNum++;
      contentTop = drawHeader(pageNum);
      drawTableHeader(contentTop);
      rowY = contentTop + 28;
    }

    doc.roundedRect(40, rowY, doc.page.width - 80, 22, 4).fill(primaryColor);
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    doc.text("TOTAL", 47, rowY + 6, { width: 170, lineBreak: false });
    doc.text(safeCurrency(summary.totalDues), 269, rowY + 6, {
      width: 55,
      align: "right",
      lineBreak: false,
    });
    doc.text(safeCurrency(summary.collected), 329, rowY + 6, {
      width: 55,
      align: "right",
      lineBreak: false,
    });
    doc.text(safeCurrency(summary.remaining), 394, rowY + 6, {
      width: 60,
      align: "right",
      lineBreak: false,
    });

    doc.end();

    // Wait for PDF to be generated
    await new Promise((resolve) => doc.on("end", resolve));

    const result = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=receipt-dues-${exportType}-${new Date().toISOString().split("T")[0]}.pdf`);
    res.setHeader("X-Receipt-Export-Skipped-Rows", String(skippedRows.length));
    return res.send(result);
  } catch (error) {
    console.error("Error exporting receipt dues:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Internal server error",
    });
  }
};

// GET /accounting/profit-loss — P&L by head, with transactions list
export const getProfitLoss = async (req, res) => {
  try {
    const { dateFrom, dateTo, year, month, courseId } = req.query;

    const normalizedYear = Number(year || 0);
    const normalizedMonth = Number(month || 0);
    const normalizedCourseId = String(courseId || "").trim();

    const matchFilter = {};
    if (dateFrom || dateTo) {
      matchFilter.paymentDate = {};
      if (dateFrom) matchFilter.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        matchFilter.paymentDate.$lte = end;
      }
    } else if (normalizedYear > 0) {
      const rangeStart = new Date(
        normalizedYear,
        normalizedMonth > 0 ? normalizedMonth - 1 : 0,
        1,
      );
      const rangeEnd =
        normalizedMonth > 0
          ? new Date(normalizedYear, normalizedMonth, 0, 23, 59, 59, 999)
          : new Date(normalizedYear, 11, 31, 23, 59, 59, 999);

      matchFilter.paymentDate = {
        $gte: rangeStart,
        $lte: rangeEnd,
      };
    }

    const [incomeType, expenseType] = await Promise.all([
      AccountingType.findOne({ name: "Income" }),
      AccountingType.findOne({ name: "Expense" }),
    ]);

    const feePaymentFilter = {};
    if (matchFilter.paymentDate) {
      feePaymentFilter.paymentDate = matchFilter.paymentDate;
    }
    if (normalizedCourseId) {
      feePaymentFilter.course = normalizedCourseId;
    }

    const payrollFilter = { isDeleted: { $ne: true } };
    if (normalizedYear > 0) {
      payrollFilter.year = normalizedYear;
    }
    if (normalizedMonth > 0) {
      payrollFilter.month = normalizedMonth;
    }

    const [
      transactions,
      feePayments,
      payrollRecords,
      courses,
      availableYearsAgg,
      allHeads,
    ] = await Promise.all([
      AccountingTransaction.find(matchFilter)
        .populate("type", "name")
        .populate("head", "name")
        .populate("paymentMethod", "name type")
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(5000),
      FeePayment.find(feePaymentFilter)
        .populate("course", "courseName courseId")
        .lean(),
      TeacherPayroll.find(payrollFilter)
        .populate({
          path: "teacher",
          select: "fullName courseId",
          populate: {
            path: "courseId",
            select: "courseName courseId",
          },
        })
        .lean(),
      CourseSchema.find({}, { courseName: 1, courseId: 1 }).lean(),
      AccountingTransaction.aggregate([
        {
          $project: {
            year: { $year: "$paymentDate" },
          },
        },
        {
          $group: {
            _id: "$year",
          },
        },
        { $sort: { _id: -1 } },
      ]),
      HeadOfAccount.find({}).populate("type", "name").lean(),
    ]);

    const transactionIds = transactions
      .map((txn) => String(txn?._id || "").trim())
      .filter(Boolean);
    const transactionBillReferences = transactions
      .map((txn) => String(txn?.billReference || "").trim())
      .filter(Boolean);

    const linkedExpenseEntries =
      transactionIds.length || transactionBillReferences.length
        ? await ExpenseHeadEntry.find({
            isActive: true,
            $or: [
              transactionIds.length
                ? { transactionId: { $in: transactionIds } }
                : null,
              transactionBillReferences.length
                ? { voucherNo: { $in: transactionBillReferences } }
                : null,
            ].filter(Boolean),
          })
            .populate("expenseCategory", "name")
            .lean()
        : [];

    const normalizeKey = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    const normalizeAlpha = (value) =>
      normalizeKey(value).replace(/[^a-z0-9\s]/g, " ");

    const buildSearchText = (...values) =>
      normalizeAlpha(
        values
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(" "),
      )
        .replace(/\s+/g, " ")
        .trim();

    const headTypeNameById = new Map();
    [incomeType, expenseType].forEach((typeRecord) => {
      if (typeRecord?._id) {
        headTypeNameById.set(String(typeRecord._id), typeRecord.name);
      }
    });

    const headsByTypeName = new Map();
    allHeads.forEach((head) => {
      const typeName =
        head?.type?.name ||
        headTypeNameById.get(String(head?.type?._id || head?.type || "")) ||
        "";
      if (!typeName) {
        return;
      }

      const bucket = headsByTypeName.get(typeName) || [];
      bucket.push({
        _id: String(head?._id || ""),
        name: head?.name || "",
        isActive: head?.isActive !== false,
        normalizedName: normalizeAlpha(head?.name || ""),
      });
      headsByTypeName.set(typeName, bucket);
    });

    const coursesByName = new Map();
    const coursesById = new Map();
    courses.forEach((course) => {
      const record = {
        _id: String(course?._id || ""),
        courseName: course?.courseName || "",
        courseId: course?.courseId || "",
      };
      if (record._id) {
        coursesById.set(record._id, record);
      }
      if (record.courseName) {
        coursesByName.set(normalizeKey(record.courseName), record);
      }
      if (record.courseId) {
        coursesByName.set(normalizeKey(record.courseId), record);
      }
    });

    const feePaymentByReference = new Map();
    feePayments.forEach((payment) => {
      const courseRecord = payment?.course
        ? {
            _id: String(payment.course?._id || payment.course || ""),
            courseName: payment.course?.courseName || "",
            courseId: payment.course?.courseId || "",
          }
        : null;
      if (!courseRecord?._id) {
        return;
      }

      [payment?.receiptNo, payment?.voucherNo].forEach((ref) => {
        const normalizedRef = String(ref || "").trim();
        if (normalizedRef) {
          feePaymentByReference.set(normalizedRef, courseRecord);
        }
      });
    });

    const payrollTransactionCourseMap = new Map();
    payrollRecords.forEach((payroll) => {
      const teacher = payroll?.teacher || {};
      const teacherCourses = Array.isArray(teacher?.courseId)
        ? teacher.courseId
        : teacher?.courseId
          ? [teacher.courseId]
          : [];

      const courseRecords = teacherCourses
        .map((course) => ({
          _id: String(course?._id || course || ""),
          courseName: course?.courseName || "",
          courseId: course?.courseId || "",
        }))
        .filter((course) => course._id);

      (payroll?.paymentEntries || []).forEach((entry) => {
        const txnId = String(entry?.transactionId || "").trim();
        if (!txnId) return;

        payrollTransactionCourseMap.set(txnId, {
          teacherName: teacher?.fullName || "",
          courses: courseRecords,
        });
      });
    });

    const expenseHeadByTransactionId = new Map();
    const expenseHeadByVoucherNo = new Map();
    linkedExpenseEntries.forEach((entry) => {
      const resolvedExpenseHead =
        entry?.expenseCategory?.name
          ? {
              _id: String(
                entry?.expenseCategory?._id || entry?.expenseCategory || "",
              ),
              name: entry.expenseCategory.name,
            }
          : null;

      if (!resolvedExpenseHead?.name) {
        return;
      }

      const transactionId = String(entry?.transactionId || "").trim();
      const voucherNo = String(entry?.voucherNo || "").trim();

      if (transactionId) {
        expenseHeadByTransactionId.set(transactionId, resolvedExpenseHead);
      }
      if (voucherNo) {
        expenseHeadByVoucherNo.set(voucherNo, resolvedExpenseHead);
      }
    });

    const resolvedHeadCache = new Map();
    const resolveHeadSnapshot = async (...candidates) => {
      for (const candidate of candidates) {
        const candidateValue =
          candidate && typeof candidate === "object"
            ? candidate?._id || candidate?.name || ""
            : candidate;
        const cacheKey = String(candidateValue || "").trim();
        if (!cacheKey) {
          continue;
        }

        if (resolvedHeadCache.has(cacheKey)) {
          const cachedHead = resolvedHeadCache.get(cacheKey);
          if (cachedHead) {
            return cachedHead;
          }
          continue;
        }

        let resolvedHead = null;
        if (candidate?.name) {
          resolvedHead = {
            _id: String(candidate?._id || ""),
            name: candidate.name,
          };
        } else {
          const headDoc = await findHeadOfAccountByAnyId(candidate);
          resolvedHead = headDoc
            ? {
                _id: String(headDoc?._id || ""),
                name: headDoc?.name || "",
              }
            : null;
        }

        resolvedHeadCache.set(cacheKey, resolvedHead);
        if (resolvedHead) {
          return resolvedHead;
        }
      }

      return null;
    };

    const getTypedHeads = (typeName) => headsByTypeName.get(typeName) || [];

    const findHeadByName = (typeName, ...names) => {
      const typedHeads = getTypedHeads(typeName);
      for (const name of names) {
        const normalizedName = normalizeAlpha(name);
        if (!normalizedName) continue;

        const matchedHead = typedHeads.find(
          (head) => head.normalizedName === normalizedName,
        );
        if (matchedHead) {
          return matchedHead;
        }
      }
      return null;
    };

    const findHeadBySearchText = (typeName, searchText) => {
      const typedHeads = getTypedHeads(typeName)
        .filter((head) => head.normalizedName)
        .sort((a, b) => b.normalizedName.length - a.normalizedName.length);

      return (
        typedHeads.find((head) => searchText.includes(head.normalizedName)) || null
      );
    };

    const inferHeadFromTransaction = ({
      txn,
      typeName,
      linkedExpenseHead,
      explicitHead,
    }) => {
      if (explicitHead?.name) {
        return explicitHead;
      }

      if (linkedExpenseHead?.name) {
        return linkedExpenseHead;
      }

      const searchText = buildSearchText(
        txn?.name,
        txn?.details,
        txn?.billReference,
      );

      if (!searchText) {
        return null;
      }

      if (typeName === "Income") {
        const installmentHead = findHeadByName(
          "Income",
          "Installment",
          "Installments",
          "instamint",
          "instalment",
        );
        const admissionHead = findHeadByName("Income", "Admission Fee");
        const booksHead = findHeadByName("Income", "Books Fee");
        const certificateHead = findHeadByName("Income", "Certificate Fee");
        const examHead = findHeadByName("Income", "Exam Fee");
        const courseFeesHead = findHeadByName("Income", "Course Fees", "Course Fee");

        if (searchText.includes("admission")) return admissionHead || null;
        if (searchText.includes("book")) return booksHead || null;
        if (searchText.includes("certificate")) return certificateHead || null;
        if (searchText.includes("exam")) return examHead || null;
        if (
          searchText.includes("installment") ||
          searchText.includes("inst ") ||
          searchText.includes("inst #")
        ) {
          return installmentHead || courseFeesHead || null;
        }

        return (
          findHeadBySearchText("Income", searchText) || courseFeesHead || null
        );
      }

      if (typeName === "Expense") {
        const salaryHead = findHeadByName(
          "Expense",
          "Salary",
          "Salaries Expenses",
        );
        if (
          searchText.includes("salary") ||
          searchText.includes("payroll") ||
          searchText.includes("wages")
        ) {
          return salaryHead || null;
        }

        return findHeadBySearchText("Expense", searchText);
      }

      return findHeadBySearchText(typeName, searchText);
    };

    const getDetailsCourseRecord = (details = "") => {
      const courseLine = String(details || "").match(/^Course\s*:\s*(.+)$/im);
      const rawCourseValue = String(courseLine?.[1] || "").trim();
      if (!rawCourseValue) {
        return null;
      }
      return (
        coursesByName.get(normalizeKey(rawCourseValue)) || {
          _id: "",
          courseName: rawCourseValue,
          courseId: "",
        }
      );
    };

    const mappedTransactions = await Promise.all(transactions.map(async (txn) => {
      const billRef = String(txn?.billReference || "").trim();
      const feeCourse = billRef ? feePaymentByReference.get(billRef) : null;
      const payrollCourseContext = payrollTransactionCourseMap.get(
        String(txn?._id || ""),
      );
      const detailsCourse = getDetailsCourseRecord(txn?.details);
      const linkedExpenseHead =
        expenseHeadByTransactionId.get(String(txn?._id || "").trim()) ||
        expenseHeadByVoucherNo.get(billRef) ||
        null;
      const explicitHead = await resolveHeadSnapshot(
        txn?.head?._id,
        txn?.head,
        linkedExpenseHead?._id,
        linkedExpenseHead?.name,
      );
      const typeName = txn?.type?.name || "";
      const inferredHead = inferHeadFromTransaction({
        txn,
        typeName,
        linkedExpenseHead,
        explicitHead,
      });
      const resolvedHead = explicitHead || inferredHead || null;

      const derivedCourses = feeCourse
        ? [feeCourse]
        : payrollCourseContext?.courses?.length
          ? payrollCourseContext.courses
          : detailsCourse
            ? [detailsCourse]
            : [];

      return {
        _id: txn._id,
        transactionNo: txn.transactionNo,
        name: txn.name,
        amount: Number(txn.amount || 0),
        billReference: txn.billReference || "",
        details: txn.details || "",
        paymentDate: txn.paymentDate,
        createdAt: txn.createdAt,
        type: txn.type,
        head:
          resolvedHead ||
          linkedExpenseHead ||
          (txn?.head?.name
            ? {
                _id: String(txn?.head?._id || ""),
                name: txn.head.name,
              }
            : null),
        paymentMethod: txn.paymentMethod,
        courseIds: derivedCourses.map((course) => String(course?._id || "")).filter(Boolean),
        courseNames: derivedCourses
          .map((course) => course?.courseName || course?.courseId || "")
          .filter(Boolean),
        courseLabel: derivedCourses
          .map((course) => course?.courseName || course?.courseId || "")
          .filter(Boolean)
          .join(", "),
        teacherName: payrollCourseContext?.teacherName || "",
      };
    }));

    const filteredTransactions = normalizedCourseId
      ? mappedTransactions.filter((txn) =>
          txn.courseIds.some((id) => String(id) === normalizedCourseId),
        )
      : mappedTransactions;

    const incomeEntries = filteredTransactions.filter(
      (txn) => txn.type?.name === "Income",
    );
    const expenseEntries = filteredTransactions.filter(
      (txn) => txn.type?.name === "Expense",
    );

    const buildBreakdown = (rows = []) =>
      Array.from(
        rows.reduce((acc, row) => {
          const headName = row?.head?.name || "Unknown";
          const existing = acc.get(headName) || {
            headName,
            total: 0,
            count: 0,
          };
          existing.total += Number(row?.amount || 0);
          existing.count += 1;
          acc.set(headName, existing);
          return acc;
        }, new Map()).values(),
      ).sort((a, b) => b.total - a.total);

    const incomeAgg = buildBreakdown(incomeEntries);
    const expenseAgg = buildBreakdown(expenseEntries);
    const totalIncome = incomeEntries.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0,
    );
    const totalExpense = expenseEntries.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0,
    );
    const netBalance = totalIncome - totalExpense;

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netBalance,
        incomeBreakdown: incomeAgg,
        expenseBreakdown: expenseAgg,
        incomeEntries,
        expenseEntries,
        transactions: filteredTransactions,
        statementRows: [
          {
            label: "Total Income",
            incomeAmount: totalIncome,
            expenseAmount: null,
          },
          {
            label: "Total Expense",
            incomeAmount: null,
            expenseAmount: totalExpense,
          },
          {
            label: netBalance >= 0 ? "Net Profit" : "Net Loss",
            incomeAmount: netBalance >= 0 ? Math.abs(netBalance) : null,
            expenseAmount: netBalance < 0 ? Math.abs(netBalance) : null,
          },
        ],
        filters: {
          year: normalizedYear || null,
          month: normalizedMonth || null,
          courseId: normalizedCourseId || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        },
        meta: {
          availableYears: availableYearsAgg
            .map((item) => Number(item?._id || 0))
            .filter((value) => value > 0),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching profit/loss:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /accounting/transactions/summary
export const getTransactionSummary = async (req, res) => {
  try {
    const balancesVisible = await canViewAccountingBalances(req);
    if (!balancesVisible) {
      return denyRestrictedAccountingAccess(res);
    }

    const { paymentMethod, dateFrom, dateTo } = req.query;
    const matchFilter = {};
    if (paymentMethod) {
      const mongoose = (await import("mongoose")).default;
      const ids = paymentMethod
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      matchFilter.paymentMethod =
        ids.length === 1
          ? new mongoose.Types.ObjectId(ids[0])
          : { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) };
    }
    if (dateFrom || dateTo) {
      matchFilter.paymentDate = {};
      if (dateFrom) matchFilter.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) matchFilter.paymentDate.$lte = new Date(dateTo);
    }

    // Get income type id
    const incomeType = await AccountingType.findOne({ name: "Income" });
    const expenseType = await AccountingType.findOne({ name: "Expense" });

    const [incomeResult, expenseResult] = await Promise.all([
      AccountingTransaction.aggregate([
        { $match: { ...matchFilter, type: incomeType?._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      AccountingTransaction.aggregate([
        { $match: { ...matchFilter, type: expenseType?._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalIncome = incomeResult[0]?.total || 0;
    const totalExpense = expenseResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    console.error("Error fetching transaction summary:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /accounting/transactions
export const getTransactions = async (req, res) => {
  try {
    const {
      type,
      head,
      paymentMethod,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (head) filter.head = head;
    if (paymentMethod) {
      const ids = paymentMethod
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      filter.paymentMethod = ids.length === 1 ? ids[0] : { $in: ids };
    }
    if (dateFrom || dateTo) {
      filter.paymentDate = {};
      if (dateFrom) filter.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
      }
    }
    if (String(search || "").trim()) {
      const escapedSearch = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { name: searchRegex },
        { transactionNo: searchRegex },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      AccountingTransaction.find(filter)
        .populate("type", "name")
        .populate("head", "name")
        .populate("paymentMethod", "name type")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1, paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AccountingTransaction.countDocuments(filter),
    ]);

    const [serializedTransactions, partyNames] = await Promise.all([
      Promise.all(transactions.map(serializeTransactionRecord)),
      getSharedPartyNames(),
    ]);

    res.status(200).json({
      success: true,
      data: serializedTransactions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
      meta: { partyNames },
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /accounting/transactions/:id
export const getTransactionById = async (req, res) => {
  try {
    const txn = await AccountingTransaction.findById(req.params.id)
      .populate("type", "name")
      .populate("head", "name")
      .populate("paymentMethod", "name type currentBalance")
      .populate("createdBy", "name email");

    if (!txn)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    res.status(200).json({
      success: true,
      data: await serializeTransactionRecord(txn),
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /accounting/transactions
export const createTransaction = async (req, res) => {
  try {
    const {
      name,
      type,
      head,
      paymentMethod,
      paymentDate,
      amount,
      billReference,
      details,
    } = req.body;

    if (
      !name ||
      !type ||
      !head ||
      !paymentMethod ||
      !paymentDate ||
      amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "name, type, head, paymentMethod, paymentDate and amount are required",
      });
    }

    const method = await findPaymentMethodByAnyId(paymentMethod);
    if (!method)
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });

    const txnType = await findAccountingTypeByAnyId(type);
    if (!txnType)
      return res
        .status(404)
        .json({ success: false, message: "Accounting type not found" });

    const resolvedHead = await findHeadOfAccountByAnyId(head);
    if (!resolvedHead)
      return res
        .status(404)
        .json({ success: false, message: "Head of account not found" });

    const transactionNo = await generateTransactionNo();
    const direction = txnType.name === "Income" ? 1 : -1;

    const txn = new AccountingTransaction({
      transactionNo,
      name: name.trim(),
      type: String(txnType._id),
      head: String(resolvedHead._id),
      paymentMethod: String(method._id),
      paymentDate: new Date(paymentDate),
      amount: Number(amount),
      billReference: billReference?.trim() || "",
      details: details?.trim() || "",
      createdBy: req.user?._id ? String(req.user._id) : undefined,
    });

    await txn.save();
    await adjustBalance(method._id, Number(amount), direction);
    await txn.populate([
      "type",
      "head",
      { path: "paymentMethod", select: "name type" },
    ]);

    res.status(201).json({
      success: true,
      data: await serializeTransactionRecord(txn),
      message: "Transaction created successfully",
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PUT /accounting/transactions/:id
export const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      head,
      paymentMethod,
      paymentDate,
      amount,
      billReference,
      details,
    } = req.body;

    const txn = await AccountingTransaction.findById(id);
    if (!txn)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    // Reverse old balance effect
    const oldType = await AccountingType.findById(txn.type);
    const oldDirection = oldType?.name === "Income" ? 1 : -1;
    await adjustBalance(txn.paymentMethod, txn.amount, -oldDirection);

    let resolvedType = null;
    let resolvedHead = null;
    let resolvedMethod = null;

    if (type) {
      resolvedType = await findAccountingTypeByAnyId(type);
      if (!resolvedType) {
        return res
          .status(404)
          .json({ success: false, message: "Accounting type not found" });
      }
    }

    if (head) {
      resolvedHead = await findHeadOfAccountByAnyId(head);
      if (!resolvedHead) {
        return res
          .status(404)
          .json({ success: false, message: "Head of account not found" });
      }
    }

    if (paymentMethod) {
      resolvedMethod = await findPaymentMethodByAnyId(paymentMethod);
      if (!resolvedMethod) {
        return res
          .status(404)
          .json({ success: false, message: "Payment method not found" });
      }
    }

    // Apply updates
    if (name) txn.name = name.trim();
    if (resolvedType) txn.type = String(resolvedType._id);
    if (resolvedHead) txn.head = String(resolvedHead._id);
    if (resolvedMethod) txn.paymentMethod = String(resolvedMethod._id);
    if (paymentDate) txn.paymentDate = new Date(paymentDate);
    if (amount !== undefined) txn.amount = Number(amount);
    if (billReference !== undefined) txn.billReference = billReference.trim();
    if (details !== undefined) txn.details = details.trim();

    await txn.save();

    // Apply new balance effect
    const newType = await AccountingType.findById(txn.type);
    const newDirection = newType?.name === "Income" ? 1 : -1;
    await adjustBalance(txn.paymentMethod, txn.amount, newDirection);

    await txn.populate([
      "type",
      "head",
      { path: "paymentMethod", select: "name type" },
    ]);

    res.status(200).json({
      success: true,
      data: await serializeTransactionRecord(txn),
      message: "Transaction updated successfully",
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /accounting/transactions/:id
export const deleteTransaction = async (req, res) => {
  try {
    const txn = await AccountingTransaction.findById(req.params.id);
    if (!txn)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    // Reverse balance effect
    const txnType = await AccountingType.findById(txn.type);
    const direction = txnType?.name === "Income" ? 1 : -1;
    await adjustBalance(txn.paymentMethod, txn.amount, -direction);

    await AccountingTransaction.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Transaction deleted and balance reversed",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /accounting/transactions/:id/revert
export const revertTransaction = async (req, res) => {
  try {
    const txn = await AccountingTransaction.findById(req.params.id);
    if (!txn) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }

    const txnType = await AccountingType.findById(txn.type);
    const direction = txnType?.name === "Income" ? 1 : -1;

    const linkedFeePayment = await FeePayment.findOne({
      $or: [
        { receiptNo: String(txn.billReference || "").trim() },
        { voucherNo: String(txn.billReference || "").trim() },
      ],
      status: "Completed",
    }).sort({ paymentDate: -1, createdAt: -1 });

    if (linkedFeePayment) {
      const feeStructure = await FeeStructure.findById(linkedFeePayment.feeStructure);
      if (!feeStructure) {
        return res.status(404).json({
          success: false,
          message: "Linked fee structure not found for this transaction",
        });
      }

      feeStructure.paidAmount = Math.max(
        0,
        Number(feeStructure.paidAmount || 0) - Number(linkedFeePayment.amount || 0),
      );
      await syncInstallmentAfterRevert(feeStructure, linkedFeePayment);
      syncFeeStructurePaymentStatus(feeStructure);
      await feeStructure.save();

      await FeePayment.findByIdAndDelete(linkedFeePayment._id);
      await adjustBalance(txn.paymentMethod, Number(txn.amount || 0), -direction);
      await AccountingTransaction.findByIdAndDelete(txn._id);

      return res.status(200).json({
        success: true,
        sourceType: "fee_payment",
        message: "Fee payment reverted successfully",
      });
    }

    const linkedTeacherPayroll = await TeacherPayroll.findOne({
      "paymentEntries.transactionId": txn._id,
    });

    if (linkedTeacherPayroll) {
      linkedTeacherPayroll.paymentEntries = (linkedTeacherPayroll.paymentEntries || []).filter(
        (entry) => String(entry.transactionId || "") !== String(txn._id),
      );

      const recalculatedPaidAmount = linkedTeacherPayroll.paymentEntries.reduce(
        (sum, entry) => sum + Number(entry.amount || 0),
        0,
      );

      const baseDueAmount = Number(linkedTeacherPayroll.baseDueAmount || 0);
      const carryForwardInAmount = Number(
        linkedTeacherPayroll.carryForwardInAmount || 0,
      );
      const recalculatedTotals = calculatePayrollTotals({
        baseDueAmount,
        carryForwardInAmount,
        paidAmount: recalculatedPaidAmount,
      });

      linkedTeacherPayroll.baseDueAmount = recalculatedTotals.baseDueAmount;
      linkedTeacherPayroll.carryForwardInAmount =
        recalculatedTotals.carryForwardInAmount;
      linkedTeacherPayroll.carryForwardEligibleAmount =
        recalculatedTotals.carryForwardEligibleAmount;
      linkedTeacherPayroll.dueAmount = recalculatedTotals.totalDueAmount;
      linkedTeacherPayroll.paidAmount = recalculatedTotals.paidAmount;
      linkedTeacherPayroll.remainingAmount = recalculatedTotals.remainingAmount;
      linkedTeacherPayroll.overpaidAmount = recalculatedTotals.overpaidAmount;
      linkedTeacherPayroll.status = recalculatedTotals.status;
      await linkedTeacherPayroll.save();

      await adjustBalance(txn.paymentMethod, Number(txn.amount || 0), -direction);
      await AccountingTransaction.findByIdAndDelete(txn._id);

      return res.status(200).json({
        success: true,
        sourceType: "teacher_payroll",
        message: "Teacher payroll payment reverted successfully",
      });
    }

    const linkedExpenseEntry = await ExpenseHeadEntry.findOne({
      $or: [
        { transactionId: txn._id },
        { voucherNo: String(txn.billReference || "").trim(), isActive: true },
      ],
    });

    if (linkedExpenseEntry) {
      if (String(linkedExpenseEntry.transactionId || "") === String(txn._id)) {
        linkedExpenseEntry.transactionId = null;
      }
      linkedExpenseEntry.isActive = true;
      await linkedExpenseEntry.save();

      await adjustBalance(txn.paymentMethod, Number(txn.amount || 0), -direction);
      await AccountingTransaction.findByIdAndDelete(txn._id);

      return res.status(200).json({
        success: true,
        sourceType: "expense_head_entry",
        message: "Expense entry reverted successfully and restored to its source list",
      });
    }

    await adjustBalance(txn.paymentMethod, Number(txn.amount || 0), -direction);
    await AccountingTransaction.findByIdAndDelete(txn._id);

    res.status(200).json({
      success: true,
      sourceType: "transaction",
      message: "Transaction reverted successfully",
    });
  } catch (error) {
    console.error("Error reverting transaction:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ============================================================
// FUND TRANSFERS
// ============================================================

// Helper — generate transfer number TRF-YYYY-NNNNN
const generateTransferNo = async () => {
  const year = new Date().getFullYear();
  const prefix = `TRF-${year}-`;
  const last = await FundTransfer.findOne({
    transferNo: new RegExp(`^${prefix}`),
  }).sort({ transferNo: -1 });
  if (!last) return `${prefix}00001`;
  const seq = parseInt(last.transferNo.split("-")[2], 10) + 1;
  return `${prefix}${String(seq).padStart(5, "0")}`;
};

// GET /accounting/fund-transfers
export const getFundTransfers = async (req, res) => {
  try {
    const balancesVisible = await canViewAccountingBalances(req);
    const {
      page = 1,
      limit = 20,
      dateFrom,
      dateTo,
      fromMethod,
      toMethod,
    } = req.query;
    const filter = {};
    if (fromMethod) filter.fromMethod = fromMethod;
    if (toMethod) filter.toMethod = toMethod;
    if (dateFrom || dateTo) {
      filter.transferDate = {};
      if (dateFrom) filter.transferDate.$gte = new Date(dateFrom);
      if (dateTo) filter.transferDate.$lte = new Date(dateTo);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [transfers, total] = await Promise.all([
      FundTransfer.find(filter)
        .populate("fromMethod", "name type currentBalance")
        .populate("toMethod", "name type currentBalance")
        .sort({ transferDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FundTransfer.countDocuments(filter),
    ]);

    // Total transferred in period
    const aggResult = await FundTransfer.aggregate([
      { $match: filter },
      { $group: { _id: null, totalTransferred: { $sum: "$amount" } } },
    ]);
    const totalTransferred = aggResult[0]?.totalTransferred || 0;

    res.status(200).json({
      success: true,
      data: transfers.map((transfer) =>
        sanitizeTransferBalanceFields(transfer, balancesVisible),
      ),
      summary: {
        totalTransferred: balancesVisible ? totalTransferred : null,
      },
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      message: "Fund transfers retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching fund transfers:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /accounting/fund-transfers
export const createFundTransfer = async (req, res) => {
  try {
    const balancesVisible = await canViewAccountingBalances(req);
    const {
      fromMethod: fromId,
      toMethod: toId,
      amount,
      transferDate,
      note,
    } = req.body;

    if (!fromId || !toId || !amount) {
      return res.status(400).json({
        success: false,
        message: "fromMethod, toMethod and amount are required",
      });
    }
    if (fromId === toId) {
      return res.status(400).json({
        success: false,
        message: "Source and destination accounts must be different",
      });
    }

    const [from, to] = await Promise.all([
      PaymentMethod.findById(fromId),
      PaymentMethod.findById(toId),
    ]);

    if (!from)
      return res
        .status(404)
        .json({ success: false, message: "Source account not found" });
    if (!to)
      return res
        .status(404)
        .json({ success: false, message: "Destination account not found" });
    if (from.currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: balancesVisible
          ? `Insufficient balance. ${from.name} has PKR ${from.currentBalance.toLocaleString()}`
          : "Insufficient balance in the selected source account",
      });
    }

    const transferNo = await generateTransferNo();

    // Deduct from source, add to destination
    from.currentBalance -= amount;
    to.currentBalance += amount;
    await Promise.all([from.save(), to.save()]);

    const transfer = await FundTransfer.create({
      transferNo,
      fromMethod: fromId,
      toMethod: toId,
      amount,
      transferDate: transferDate || new Date(),
      note,
      createdBy: req.user?._id,
    });

    await transfer.populate([
      { path: "fromMethod", select: "name type currentBalance" },
      { path: "toMethod", select: "name type currentBalance" },
    ]);

    res.status(201).json({
      success: true,
      data: sanitizeTransferBalanceFields(transfer, balancesVisible),
      message: "Fund transfer created successfully",
    });
  } catch (error) {
    console.error("Error creating fund transfer:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE /accounting/fund-transfers/:id
export const deleteFundTransfer = async (req, res) => {
  try {
    const transfer = await FundTransfer.findById(req.params.id);
    if (!transfer)
      return res
        .status(404)
        .json({ success: false, message: "Transfer not found" });

    const [from, to] = await Promise.all([
      PaymentMethod.findById(transfer.fromMethod),
      PaymentMethod.findById(transfer.toMethod),
    ]);

    // Reverse: add back to source, deduct from destination
    if (from) {
      from.currentBalance += transfer.amount;
      await from.save();
    }
    if (to) {
      to.currentBalance -= transfer.amount;
      await to.save();
    }

    await FundTransfer.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .json({ success: true, message: "Fund transfer reversed and deleted" });
  } catch (error) {
    console.error("Error deleting fund transfer:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ============================================================
// LEDGER
// ============================================================

// GET /accounting/ledger/:paymentMethodId
// Returns chronological statement lines with running balance for a given account.
// Optional query: dateFrom, dateTo
export const getLedger = async (req, res) => {
  try {
    const balancesVisible = await canViewAccountingBalances(req);
    if (!balancesVisible) {
      return denyRestrictedAccountingAccess(res);
    }

    const { paymentMethodId } = req.params;
    const { dateFrom, dateTo } = req.query;

    // Explicit ObjectId cast — avoids silent mismatches on string vs ObjectId comparison
    const mongoose = (await import("mongoose")).default;
    let methodOid;
    try {
      methodOid = new mongoose.Types.ObjectId(paymentMethodId);
    } catch {
      return res
        .status(400)
        .json({ success: false, message: "Invalid account ID" });
    }

    const method = await PaymentMethod.findById(methodOid);
    if (!method)
      return res
        .status(404)
        .json({ success: false, message: "Account not found" });

    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);

    // ── Fetch transactions for this account ─────────────────
    const txnFilter = { paymentMethod: methodOid };
    if (dateFrom || dateTo) txnFilter.paymentDate = dateFilter;

    const txns = await AccountingTransaction.find(txnFilter)
      .populate("type", "name")
      .populate("head", "name")
      .lean();

    // ── Fetch fund transfers involving this account ──────────
    const transferFilter = {
      $or: [{ fromMethod: methodOid }, { toMethod: methodOid }],
    };
    if (dateFrom || dateTo) transferFilter.transferDate = dateFilter;

    const transfers = await FundTransfer.find(transferFilter)
      .populate("fromMethod", "name")
      .populate("toMethod", "name")
      .lean();

    // ── Build unified ledger lines ───────────────────────────
    const lines = [];

    for (const t of txns) {
      const isIncome = t.type?.name === "Income";
      lines.push({
        _id: t._id,
        date: t.paymentDate || t.createdAt,
        refNo: t.transactionNo,
        description: `${t.name}${t.head?.name ? " — " + t.head.name : ""}`,
        type: "transaction",
        typeName: t.type?.name || (isIncome ? "Income" : "Expense"),
        in: isIncome ? t.amount : 0,
        out: isIncome ? 0 : t.amount,
        billReference: t.billReference || "",
      });
    }

    for (const tf of transfers) {
      const isCredit = String(tf.toMethod?._id) === String(methodOid);
      lines.push({
        _id: tf._id,
        date: tf.transferDate || tf.createdAt,
        refNo: tf.transferNo,
        description: isCredit
          ? `Transfer IN from ${tf.fromMethod?.name}`
          : `Transfer OUT to ${tf.toMethod?.name}`,
        type: "transfer",
        typeName: isCredit ? "Income" : "Expense",
        in: isCredit ? tf.amount : 0,
        out: isCredit ? 0 : tf.amount,
        billReference: tf.note || "",
      });
    }

    // ── Sort by date ascending ───────────────────────────────
    lines.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ── Compute running balance starting from openingBalance ─
    let running = method.openingBalance || 0;
    const statement = lines.map((line) => {
      running += line.in - line.out;
      return { ...line, balance: running };
    });

    const totalIn = lines.reduce((s, l) => s + l.in, 0);
    const totalOut = lines.reduce((s, l) => s + l.out, 0);

    res.status(200).json({
      success: true,
      data: statement,
      summary: {
        openingBalance: method.openingBalance || 0,
        totalIn,
        totalOut,
        closingBalance: running,
        accountName: method.name,
        accountType: method.type,
        currentBalance: method.currentBalance,
      },
      message: "Ledger retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching ledger:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getSuperAdminFinanceMonitor = async (req, res) => {
  try {
    const { start, end, monthKey, label } = getMonthRange(req.query.month);
    const months = Math.min(Math.max(parseInt(req.query.months, 10) || 6, 1), 12);

    const [paymentMethods, incomeType, expenseType] = await Promise.all([
      PaymentMethod.find({ isActive: true }).lean(),
      AccountingType.findOne({ name: "Income" }).lean(),
      AccountingType.findOne({ name: "Expense" }).lean(),
    ]);

    const [feePayments, transactions, installmentSummary, monthWise, recentPayments] =
      await Promise.all([
        FeePayment.aggregate([
          {
            $match: {
              status: { $in: ["Completed", "Pending", "Refunded"] },
              paymentDate: { $gte: start, $lt: end },
            },
          },
          {
            $group: {
              _id: null,
              totalCollected: { $sum: "$amount" },
              paymentsCount: { $sum: 1 },
              installmentPaidAmount: {
                $sum: {
                  $cond: [{ $ifNull: ["$installmentNumber", false] }, "$amount", 0],
                },
              },
              installmentPaidCount: {
                $sum: {
                  $cond: [{ $ifNull: ["$installmentNumber", false] }, 1, 0],
                },
              },
            },
          },
        ]),
        AccountingTransaction.aggregate([
          { $match: { paymentDate: { $gte: start, $lt: end } } },
          {
            $group: {
              _id: "$type",
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ]),
        FeeStructure.aggregate([
          { $unwind: "$installments" },
          {
            $match: {
              "installments.dueDate": { $gte: start, $lt: end },
            },
          },
          {
            $group: {
              _id: null,
              totalInstallmentAmount: { $sum: "$installments.amount" },
              totalPaidAmount: { $sum: "$installments.paidAmount" },
              paidCount: {
                $sum: {
                  $cond: [{ $eq: ["$installments.status", "Paid"] }, 1, 0],
                },
              },
              partialCount: {
                $sum: {
                  $cond: [{ $eq: ["$installments.status", "Partial"] }, 1, 0],
                },
              },
              pendingCount: {
                $sum: {
                  $cond: [{ $eq: ["$installments.status", "Pending"] }, 1, 0],
                },
              },
              overdueCount: {
                $sum: {
                  $cond: [{ $eq: ["$installments.status", "Overdue"] }, 1, 0],
                },
              },
            },
          },
        ]),
        Promise.all(
          Array.from({ length: months }).map(async (_, index) => {
            const monthStart = new Date(start.getFullYear(), start.getMonth() - (months - 1 - index), 1);
            const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

            const [monthFeePayments, monthTransactions, monthInstallments] = await Promise.all([
              FeePayment.aggregate([
                {
                  $match: {
                    status: { $in: ["Completed", "Pending", "Refunded"] },
                    paymentDate: { $gte: monthStart, $lt: monthEnd },
                  },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
              ]),
              AccountingTransaction.aggregate([
                { $match: { paymentDate: { $gte: monthStart, $lt: monthEnd } } },
                { $group: { _id: "$type", total: { $sum: "$amount" } } },
              ]),
              FeeStructure.aggregate([
                { $unwind: "$installments" },
                {
                  $match: {
                    "installments.dueDate": { $gte: monthStart, $lt: monthEnd },
                  },
                },
                {
                  $group: {
                    _id: null,
                    totalInstallments: { $sum: "$installments.amount" },
                    pendingAmount: {
                      $sum: {
                        $max: [
                          { $subtract: ["$installments.amount", "$installments.paidAmount"] },
                          0,
                        ],
                      },
                    },
                  },
                },
              ]),
            ]);

            const income =
              monthTransactions.find(
                (item) => String(item._id) === String(incomeType?._id),
              )?.total || 0;
            const expense =
              monthTransactions.find(
                (item) => String(item._id) === String(expenseType?._id),
              )?.total || 0;

            return {
              month: monthStart.toLocaleString("en-US", {
                month: "short",
                year: "numeric",
              }),
              feeCollected: monthFeePayments[0]?.total || 0,
              income,
              expense,
              net: income - expense,
              installmentAmount: monthInstallments[0]?.totalInstallments || 0,
              pendingInstallmentAmount: monthInstallments[0]?.pendingAmount || 0,
            };
          }),
        ),
        FeePayment.find({
          status: { $in: ["Completed", "Pending", "Refunded"] },
          paymentDate: { $gte: start, $lt: end },
        })
          .populate("student", "registrationNo studentName")
          .populate("course", "courseName courseId")
          .sort({ paymentDate: -1, createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    const transactionIncome =
      transactions.find((item) => String(item._id) === String(incomeType?._id))
        ?.total || 0;
    const transactionExpense =
      transactions.find((item) => String(item._id) === String(expenseType?._id))
        ?.total || 0;

    const installmentTotals = installmentSummary[0] || {};
    const totalInstallmentAmount = installmentTotals.totalInstallmentAmount || 0;
    const totalInstallmentPaidAmount = installmentTotals.totalPaidAmount || 0;
    const totalPendingInstallmentAmount = Math.max(
      totalInstallmentAmount - totalInstallmentPaidAmount,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        period: {
          month: monthKey,
          label,
          start,
          end: new Date(end.getTime() - 1),
        },
        settings: {
          showAccountingBalancesToUsers:
            (await getAccountingVisibilitySettings()).showAccountingBalancesToUsers === true,
        },
        balances: {
          totalOpeningBalance: paymentMethods.reduce(
            (sum, item) => sum + Number(item.openingBalance || 0),
            0,
          ),
          totalCurrentBalance: paymentMethods.reduce(
            (sum, item) => sum + Number(item.currentBalance || 0),
            0,
          ),
          accountsCount: paymentMethods.length,
        },
        feePayments: {
          totalCollected: feePayments[0]?.totalCollected || 0,
          paymentsCount: feePayments[0]?.paymentsCount || 0,
          installmentPaidAmount: feePayments[0]?.installmentPaidAmount || 0,
          installmentPaidCount: feePayments[0]?.installmentPaidCount || 0,
        },
        installments: {
          totalInstallmentAmount,
          totalInstallmentPaidAmount,
          totalPendingInstallmentAmount,
          paidCount: installmentTotals.paidCount || 0,
          partialCount: installmentTotals.partialCount || 0,
          pendingCount: installmentTotals.pendingCount || 0,
          overdueCount: installmentTotals.overdueCount || 0,
        },
        accounting: {
          totalIncome: transactionIncome,
          totalExpense: transactionExpense,
          netBalance: transactionIncome - transactionExpense,
        },
        monthWise,
        recentPayments,
      },
      message: "Super admin finance monitor retrieved successfully",
    });
  } catch (error) {
    console.error("Error fetching super admin finance monitor:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
