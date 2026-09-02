/**
 * autoAccountingEntry.js
 *
 * Automatically creates an AccountingTransaction (Income or Expense) whenever
 * a fee payment or refund is recorded, keeping the accounting module in sync.
 *
 * Head resolution order:
 *  1. Exact name match (case-insensitive) on preferredHeadName
 *  2. If not found → create the head under the resolved type automatically
 *
 * PaymentMethod resolution order:
 *  1. Exact name match on paymentMethodStr
 *  2. isDefault=true active method
 *  3. First active method
 */

import AccountingTransaction from "../modules/accountingTransactionModule.js";
import AccountingType from "../modules/accountingTypeModule.js";
import HeadOfAccount from "../modules/headOfAccountModule.js";
import PaymentMethod from "../modules/paymentMethodModule.js";

// ── helpers ──────────────────────────────────────────────────────────────────
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

const adjustBalance = async (paymentMethodId, amount, direction) => {
  await PaymentMethod.findByIdAndUpdate(paymentMethodId, {
    $inc: { currentBalance: direction * amount },
  });
};

/**
 * Resolve or auto-create a HeadOfAccount by name under the given type.
 */
const resolveOrCreateHead = async (typeId, headName, description = "") => {
  // Try exact match first
  let head = await HeadOfAccount.findOne({
    type: typeId,
    name: { $regex: new RegExp(`^${headName.trim()}$`, "i") },
  });
  if (head) return head;

  // Auto-create if not found
  head = new HeadOfAccount({
    name: headName.trim(),
    type: typeId,
    description: description || `Auto-created for ${headName}`,
    isActive: true,
  });
  await head.save();
  console.info(`[AutoAccounting] Created new HeadOfAccount: "${headName}"`);
  return head;
};

// ── main export ───────────────────────────────────────────────────────────────
/**
 * @param {Object}  opts
 * @param {"Income"|"Expense"} opts.entryType
 * @param {string}  opts.preferredHeadName
 * @param {number}  opts.amount
 * @param {Date}    opts.paymentDate
 * @param {string}  opts.studentName
 * @param {string}  [opts.studentRegNo]
 * @param {string}  [opts.studentMobile]
 * @param {string}  [opts.courseName]
 * @param {string}  [opts.receiptNo]
 * @param {string}  [opts.voucherNo]
 * @param {string|import('mongoose').Types.ObjectId} [opts.paymentMethodId]  Direct ObjectId override — skips name lookup
 * @param {string}  [opts.paymentMethodStr]        Fallback name-based lookup
 * @param {string}  [opts.paymentType]
 * @param {number}  [opts.installmentNumber]
 * @param {string}  [opts.transactionId]
 * @param {string}  [opts.chequeNo]
 * @param {string}  [opts.bankName]
 * @param {string}  [opts.receivedBy]
 * @param {string}  [opts.remarks]
 * @param {string}  [opts.refundReason]
 * @param {string}  [opts.refundedBy]
 */
export const createAutoAccountingEntry = async (opts) => {
  const {
    entryType,
    preferredHeadName,
    amount,
    paymentDate,
    studentName,
    studentRegNo,
    studentMobile,
    courseName,
    receiptNo,
    voucherNo,
    paymentMethodId,
    paymentMethodStr,
    paymentType,
    installmentNumber,
    transactionId,
    chequeNo,
    bankName,
    receivedBy,
    remarks,
    refundReason,
    refundedBy,
  } = opts;

  // 1 ─ Resolve AccountingType
  const normalizedEntryType =
    typeof entryType === "string" &&
    entryType.trim().toLowerCase() === "expense"
      ? "Expense"
      : "Income";

  const txnType = await AccountingType.findOne({
    name: new RegExp(`^${normalizedEntryType}$`, "i"),
  });
  if (!txnType) {
    console.warn(
      `[AutoAccounting] AccountingType "${normalizedEntryType}" not found — skipping.`,
    );
    return;
  }

  // 2 ─ Resolve or create HeadOfAccount
  const headName =
    preferredHeadName ||
    (entryType === "Income" ? "Course Fees" : "Fees Refund");
  const headDesc =
    entryType === "Income"
      ? "Student course / tuition fee income"
      : "Student fee refund expense";
  const head = await resolveOrCreateHead(txnType._id, headName, headDesc);

  // 3 ─ Resolve PaymentMethod
  //     Priority: direct ObjectId > name match > default > first active
  let method = null;
  if (paymentMethodId) {
    method = await PaymentMethod.findById(paymentMethodId);
    if (!method)
      console.warn(
        `[AutoAccounting] paymentMethodId ${paymentMethodId} not found, falling back to name lookup.`,
      );
  }
  if (!method && paymentMethodStr) {
    method = await PaymentMethod.findOne({
      name: { $regex: new RegExp(paymentMethodStr.trim(), "i") },
      isActive: true,
    });
  }
  if (!method)
    method = await PaymentMethod.findOne({ isDefault: true, isActive: true });
  if (!method) method = await PaymentMethod.findOne({ isActive: true });
  if (!method) {
    console.warn("[AutoAccounting] No PaymentMethod found — skipping.");
    return;
  }

  // 4 ─ Build rich description
  const lines = [];
  lines.push(
    `Student : ${studentName}${studentRegNo ? ` (${studentRegNo})` : ""}${studentMobile ? ` | Mobile: ${studentMobile}` : ""}`,
  );
  if (courseName) lines.push(`Course  : ${courseName}`);
  if (paymentType)
    lines.push(
      `Pay Type: ${paymentType}${installmentNumber ? ` — Installment #${installmentNumber}` : ""}`,
    );
  lines.push(`Method  : ${paymentMethodStr || method.name}`);
  if (receiptNo) lines.push(`Receipt : ${receiptNo}`);
  if (voucherNo) lines.push(`Voucher : ${voucherNo}`);
  if (transactionId) lines.push(`Txn ID  : ${transactionId}`);
  if (chequeNo)
    lines.push(`Cheque  : ${chequeNo}${bankName ? ` — ${bankName}` : ""}`);
  if (receivedBy) lines.push(`Recv by : ${receivedBy}`);
  if (remarks) lines.push(`Remarks : ${remarks}`);
  if (refundReason) lines.push(`Reason  : ${refundReason}`);
  if (refundedBy) lines.push(`By      : ${refundedBy}`);
  const details = lines.join("\n");

  // 5 ─ Build entry name (concise, shown in table)
  const label =
    entryType === "Income"
      ? `Fee Payment — ${studentName}${installmentNumber ? ` (Inst. #${installmentNumber})` : ""}`
      : `Fee Refund — ${studentName}`;

  // 6 ─ Generate transaction number
  const transactionNo = await generateTransactionNo();

  // 7 ─ Persist
  const txn = new AccountingTransaction({
    transactionNo,
    name: label,
    type: txnType._id,
    head: head._id,
    paymentMethod: method._id,
    paymentDate: new Date(paymentDate),
    amount: Number(amount),
    billReference: receiptNo || voucherNo || "",
    details,
  });
  await txn.save();

  // 8 ─ Adjust balance
  const direction = entryType === "Income" ? 1 : -1;
  await adjustBalance(method._id, Number(amount), direction);

  console.info(
    `[AutoAccounting] ${entryType} ${transactionNo} | ${label} | PKR ${amount} | ` +
      `Head: ${head.name} | Method: ${method.name}`,
  );
};
