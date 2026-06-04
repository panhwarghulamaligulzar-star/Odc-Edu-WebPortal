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
import PDFKit from "pdfkit";

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

// ============================================================
// ACCOUNTING TYPES
// ============================================================

// GET /accounting/types — list all seeded types
export const getAccountingTypes = async (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      data: heads,
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

    // Check if a head with the same name exists under the same type
    const existing = await HeadOfAccount.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      type,
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
      type,
      description: description?.trim() || "",
    });

    await head.save();
    await head.populate("type", "name");

    res.status(201).json({
      success: true,
      data: head,
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
    const { id } = req.params;
    const { name, type, description, isActive } = req.body;

    const head = await HeadOfAccount.findById(id);
    if (!head) {
      return res.status(404).json({
        success: false,
        message: "Head of account not found",
      });
    }

    if (name) head.name = name.trim();
    if (type) head.type = type;
    if (description !== undefined) head.description = description.trim();
    if (isActive !== undefined) head.isActive = isActive;

    await head.save();
    await head.populate("type", "name");

    res.status(200).json({
      success: true,
      data: head,
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
    const { id } = req.params;

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
    const balancesVisible = await canViewAccountingBalances(req);
    const methods = await PaymentMethod.find({ isActive: true }).sort({
      isDefault: -1,
      name: 1,
    });
    const data = methods.map((method) => {
      const methodData = method.toObject();
      if (!balancesVisible) {
        methodData.openingBalance = null;
        methodData.currentBalance = null;
      }
      return methodData;
    });
    res.status(200).json({
      success: true,
      data,
      meta: { balancesVisible },
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
    const { name, bankDetails, openingBalance } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Bank name is required",
      });
    }

    const existing = await PaymentMethod.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
      isActive: true,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A payment method with this name already exists",
      });
    }

    const opening = Number(openingBalance) || 0;

    const method = new PaymentMethod({
      name: name.trim(),
      type: "bank",
      bankDetails: bankDetails || {},
      openingBalance: opening,
      currentBalance: opening,
      isDefault: false,
    });

    await method.save();

    res.status(201).json({
      success: true,
      data: method,
      message: "Bank created successfully",
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

// GET /accounting/monthly-summary — income & expense grouped by month (last N months)
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

    if (!enrolledFeeStructures.length) {
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
          dueStatus: entry.status,
          feeStatus: item.feeStatus,
          installmentEnabled: !!item.installmentEnabled,
          numberOfInstallments: item.numberOfInstallments || 1,
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

    if (!enrolledFeeStructures.length) {
      // Return empty PDF
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
          dueStatus: entry.status,
          feeStatus: item.feeStatus,
          installmentEnabled: !!item.installmentEnabled,
          numberOfInstallments: item.numberOfInstallments || 1,
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
      filteredRows = filteredRows.filter(row => 
        row.dueStatus.toLowerCase() === exportType.toLowerCase()
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

    // Create PDF document with professional layout
    const doc = new PDFKit({ margin: 40, size: "A4", bufferPages: true });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // Colors
    const primaryColor = "#0f766e";
    const secondaryColor = "#134e4a";
    const lightGray = "#f3f4f6";
    const darkGray = "#374151";

    // Helper function to draw header
    const drawHeader = (pageNum = 1, totalPages = 0) => {
      // Top bar with primary color
      doc.rect(0, 0, doc.page.width, 45).fill(primaryColor);
      
      // Company name
      doc.fillColor("#ffffff")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text("ODC Education Center", 40, 12, { align: "center" });
      
      // Report title below header
      doc.fillColor(secondaryColor)
        .fontSize(14)
        .font("Helvetica")
        .text("Student Receipt Dues Report", 40, 55);
      
      // Date on right side
      doc.fillColor(darkGray)
        .fontSize(9)
        .text(`Generated: ${new Date().toLocaleDateString("en-GB", { 
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        })}`, doc.page.width - 180, 55);
      
      // Line under title
      doc.strokeColor(primaryColor)
        .lineWidth(2)
        .moveTo(40, 78)
        .lineTo(doc.page.width - 40, 78)
        .stroke();
      
      return 90; // Return starting Y position for content
    };

    // Draw initial header
    let contentTop = drawHeader();

    // Summary Box
    const boxTop = contentTop + 10;
    doc.rect(40, boxTop, doc.page.width - 80, 85).fill(lightGray).stroke(primaryColor);
    
    doc.fillColor(secondaryColor)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Financial Summary", 50, boxTop + 8);
    
    // Summary items in two columns
    doc.fontSize(10).font("Helvetica").fillColor(darkGray);
    const summaryLeft = 50;
    const summaryRight = 220;
    let summaryY = boxTop + 28;
    
    // Left column
    doc.text(`Total Dues:`, summaryLeft, summaryY);
    doc.font("Helvetica-Bold").text(`Rs ${summary.totalDues.toLocaleString("en-PK")}`, summaryLeft + 70, summaryY);
    doc.font("Helvetica").fillColor(darkGray);
    
    doc.text(`Collected:`, summaryLeft, summaryY + 14);
    doc.font("Helvetica-Bold").fillColor("#059669").text(`Rs ${summary.collected.toLocaleString("en-PK")}`, summaryLeft + 70, summaryY + 14);
    doc.font("Helvetica").fillColor(darkGray);
    
    doc.text(`Remaining:`, summaryLeft, summaryY + 28);
    doc.font("Helvetica-Bold").fillColor("#dc2626").text(`Rs ${summary.remaining.toLocaleString("en-PK")}`, summaryLeft + 70, summaryY + 28);
    
    // Right column
    doc.fillColor(darkGray).font("Helvetica");
    doc.text(`Total Entries:`, summaryRight, summaryY);
    doc.font("Helvetica-Bold").text(`${summary.studentCount}`, summaryRight + 75, summaryY);
    
    doc.font("Helvetica");
    doc.text(`Paid:`, summaryRight, summaryY + 14);
    doc.font("Helvetica-Bold").fillColor("#059669").text(`${summary.paidCount}`, summaryRight + 75, summaryY + 14);
    
    doc.font("Helvetica").fillColor(darkGray);
    doc.text(`Partial:`, summaryRight, summaryY + 28);
    doc.font("Helvetica-Bold").fillColor("#2563eb").text(`${summary.partialCount}`, summaryRight + 75, summaryY + 28);
    
    doc.font("Helvetica").fillColor(darkGray);
    doc.text(`Pending:`, summaryRight + 100, summaryY + 28);
    doc.font("Helvetica-Bold").fillColor("#d97706").text(`${summary.pendingCount}`, summaryRight + 175, summaryY + 28);
    
    // Filters info
    doc.fillColor(darkGray).font("Helvetica").fontSize(8);
    let filterY = boxTop + 70;
    doc.text(`Filter: ${status || "All Status"} | Course: ${courseId || "All"}`, 50, filterY);
    if (dueDateFrom && dueDateTo) {
      doc.text(`Date Range: ${new Date(dueDateFrom).toLocaleDateString("en-GB")} - ${new Date(dueDateTo).toLocaleDateString("en-GB")}`, 300, filterY);
    }

    contentTop = boxTop + 100;

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

    // Calculate table width
    const tableWidth = tableHeaders.reduce((sum, h) => sum + h.width, 0);
    const tableX = (doc.page.width - tableWidth) / 2;

    // Table header background
    doc.rect(40, contentTop, doc.page.width - 80, 22).fill(primaryColor);
    
    // Table headers
    let headerX = 45;
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    tableHeaders.forEach((h, i) => {
      if (h.align === "right") {
        doc.text(h.label, headerX + h.width - 10, contentTop + 6, { width: h.width, align: "right" });
      } else {
        doc.text(h.label, headerX, contentTop + 6, { width: h.width });
      }
      headerX += h.width;
    });

    // Draw data rows
    let rowY = contentTop + 22;
    const rowHeight = 18;
    const pageHeight = doc.page.height - 60;
    let pageNum = 1;

    filteredRows.forEach((row, index) => {
      // Check if we need a new page
      if (rowY + rowHeight > pageHeight) {
        // Draw footer on current page
        doc.fillColor(darkGray).fontSize(8)
          .text(`Page ${pageNum}`, 50, pageHeight + 10)
          .text("ODC Education Center - Receipt Dues Report", doc.page.width - 180, pageHeight + 10);
        
        doc.addPage();
        pageNum++;
        rowY = 40;
        
        // Redraw header on new page
        doc = drawHeader(pageNum);
        rowY = contentTop;
        
        // Redraw table header
        doc.rect(40, rowY, doc.page.width - 80, 22).fill(primaryColor);
        headerX = 45;
        doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
        tableHeaders.forEach((h, i) => {
          if (h.align === "right") {
            doc.text(h.label, headerX + h.width - 10, rowY + 6, { width: h.width, align: "right" });
          } else {
            doc.text(h.label, headerX, rowY + 6, { width: h.width });
          }
          headerX += h.width;
        });
        rowY += 22;
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.rect(40, rowY, doc.page.width - 80, rowHeight).fill(lightGray);
      }

      // Draw row data
      doc.fillColor(darkGray).fontSize(8).font("Helvetica");
      let dataX = 45;
      const rowData = [
        String(index + 1),
        row.student?.registrationNo || "-",
        (row.student?.studentName || "-").substring(0, 18),
        (row.course?.courseName || "-").substring(0, 14),
        (row.amount || 0).toLocaleString("en-PK"),
        (row.paidAmount || 0).toLocaleString("en-PK"),
        (row.remainingAmount || 0).toLocaleString("en-PK"),
        row.dueStatus || "-",
      ];

      tableHeaders.forEach((h, i) => {
        const value = rowData[i];
        if (h.align === "right") {
          doc.text(value, dataX + h.width - 5, rowY + 4, { width: h.width, align: "right" });
        } else {
          doc.text(value, dataX, rowY + 4, { width: h.width });
        }
        dataX += h.width;
      });

      // Status color
      if (row.dueStatus === "Paid") {
        doc.fillColor("#059669");
      } else if (row.dueStatus === "Partial") {
        doc.fillColor("#2563eb");
      } else if (row.dueStatus === "Pending") {
        doc.fillColor("#d97706");
      }
      doc.text(row.dueStatus || "-", dataX - 50, rowY + 4, { width: 50 });

      rowY += rowHeight;
    });

    // Draw total row
    doc.rect(40, rowY, doc.page.width - 80, 20).fill(primaryColor);
    doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold");
    doc.text("TOTAL", 45, rowY + 5, { width: 170 });
    doc.text(summary.totalDues.toLocaleString("en-PK"), 270, rowY + 5, { width: 60, align: "right" });
    doc.text(summary.collected.toLocaleString("en-PK"), 330, rowY + 5, { width: 60, align: "right" });
    doc.text(summary.remaining.toLocaleString("en-PK"), 395, rowY + 5, { width: 65, align: "right" });

    // Footer on last page
    doc.fillColor(darkGray).fontSize(8)
      .text(`Page ${pageNum}`, 50, pageHeight + 10)
      .text("ODC Education Center - Receipt Dues Report", doc.page.width - 180, pageHeight + 10);

    doc.end();

    // Wait for PDF to be generated
    await new Promise((resolve) => doc.on("end", resolve));

    const result = Buffer.concat(chunks);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=receipt-dues-${exportType}-${new Date().toISOString().split("T")[0]}.pdf`);
    return res.send(result);
  } catch (error) {
    console.error("Error exporting receipt dues:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// GET /accounting/profit-loss — P&L by head, with transactions list
export const getProfitLoss = async (req, res) => {
  try {
    const balancesVisible = await canViewAccountingBalances(req);
    if (!balancesVisible) {
      return denyRestrictedAccountingAccess(res);
    }

    const { dateFrom, dateTo } = req.query;

    const matchFilter = {};
    if (dateFrom || dateTo) {
      matchFilter.paymentDate = {};
      if (dateFrom) matchFilter.paymentDate.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        matchFilter.paymentDate.$lte = end;
      }
    }

    const [incomeType, expenseType] = await Promise.all([
      AccountingType.findOne({ name: "Income" }),
      AccountingType.findOne({ name: "Expense" }),
    ]);

    const [incomeAgg, expenseAgg, transactions] = await Promise.all([
      // Income grouped by head
      AccountingTransaction.aggregate([
        { $match: { ...matchFilter, type: incomeType?._id } },
        {
          $group: {
            _id: "$head",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "headofaccounts",
            localField: "_id",
            foreignField: "_id",
            as: "headInfo",
          },
        },
        { $unwind: { path: "$headInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            headName: { $ifNull: ["$headInfo.name", "Unknown"] },
            total: 1,
            count: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),
      // Expense grouped by head
      AccountingTransaction.aggregate([
        { $match: { ...matchFilter, type: expenseType?._id } },
        {
          $group: {
            _id: "$head",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: "headofaccounts",
            localField: "_id",
            foreignField: "_id",
            as: "headInfo",
          },
        },
        { $unwind: { path: "$headInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            headName: { $ifNull: ["$headInfo.name", "Unknown"] },
            total: 1,
            count: 1,
          },
        },
        { $sort: { total: -1 } },
      ]),
      // All transactions in date range for the list section
      AccountingTransaction.find(matchFilter)
        .populate("type", "name")
        .populate("head", "name")
        .populate("paymentMethod", "name type")
        .sort({ paymentDate: -1 })
        .limit(1000),
    ]);

    const totalIncome = incomeAgg.reduce((sum, r) => sum + r.total, 0);
    const totalExpense = expenseAgg.reduce((sum, r) => sum + r.total, 0);

    res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        incomeBreakdown: incomeAgg,
        expenseBreakdown: expenseAgg,
        transactions,
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      AccountingTransaction.find(filter)
        .populate("type", "name")
        .populate("head", "name")
        .populate("paymentMethod", "name type")
        .populate("createdBy", "name email")
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AccountingTransaction.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
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

    res.status(200).json({ success: true, data: txn });
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

    const method = await PaymentMethod.findById(paymentMethod);
    if (!method)
      return res
        .status(404)
        .json({ success: false, message: "Payment method not found" });

    const txnType = await AccountingType.findById(type);
    if (!txnType)
      return res
        .status(404)
        .json({ success: false, message: "Accounting type not found" });

    const transactionNo = await generateTransactionNo();
    const direction = txnType.name === "Income" ? 1 : -1;

    const txn = new AccountingTransaction({
      transactionNo,
      name: name.trim(),
      type,
      head,
      paymentMethod,
      paymentDate: new Date(paymentDate),
      amount: Number(amount),
      billReference: billReference?.trim() || "",
      details: details?.trim() || "",
      createdBy: req.user?._id,
    });

    await txn.save();
    await adjustBalance(paymentMethod, Number(amount), direction);
    await txn.populate([
      "type",
      "head",
      { path: "paymentMethod", select: "name type" },
    ]);

    res.status(201).json({
      success: true,
      data: txn,
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

    // Apply updates
    if (name) txn.name = name.trim();
    if (type) txn.type = type;
    if (head) txn.head = head;
    if (paymentMethod) txn.paymentMethod = paymentMethod;
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
      data: txn,
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
