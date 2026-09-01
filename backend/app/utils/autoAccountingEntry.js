import AccountingTransaction from "../modules/accountingTransactionModule.js";
import AccountingType from "../modules/accountingTypeModule.js";
import HeadOfAccount from "../modules/headOfAccountModule.js";
import PaymentMethod from "../modules/paymentMethodModule.js";

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

const resolveOrCreateHead = async (typeId, headName, description = "") => {
  let head = await HeadOfAccount.findOne({
    type: typeId,
    name: { $regex: new RegExp(`^${headName.trim()}$`, "i") },
  });
  if (head) return head;

  head = new HeadOfAccount({
    name: headName.trim(),
    type: typeId,
    description: description || `Auto-created for ${headName}`,
    isActive: true,
  });
  await head.save();
  return head;
};

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
    entryBreakdown = [],
  } = opts;

  const normalizedEntryType =
    typeof entryType === "string" &&
    entryType.trim().toLowerCase() === "expense"
      ? "Expense"
      : "Income";

  const txnType = await AccountingType.findOne({
    name: new RegExp(`^${normalizedEntryType}$`, "i"),
  });
  if (!txnType) {
    return;
  }

  let method = null;
  if (paymentMethodId) {
    method = await PaymentMethod.findById(paymentMethodId);
  }
  if (!method && paymentMethodStr) {
    method = await PaymentMethod.findOne({
      name: { $regex: new RegExp(paymentMethodStr.trim(), "i") },
      isActive: true,
    });
  }
  if (!method) {
    method = await PaymentMethod.findOne({ isDefault: true, isActive: true });
  }
  if (!method) {
    method = await PaymentMethod.findOne({ isActive: true });
  }
  if (!method) {
    return;
  }

  const lines = [];
  lines.push(
    `Student : ${studentName}${studentRegNo ? ` (${studentRegNo})` : ""}${studentMobile ? ` | Mobile: ${studentMobile}` : ""}`,
  );
  if (courseName) lines.push(`Course  : ${courseName}`);
  if (paymentType) {
    lines.push(
      `Pay Type: ${paymentType}${installmentNumber ? ` - Installment #${installmentNumber}` : ""}`,
    );
  }
  lines.push(`Method  : ${paymentMethodStr || method.name}`);
  if (receiptNo) lines.push(`Receipt : ${receiptNo}`);
  if (voucherNo) lines.push(`Voucher : ${voucherNo}`);
  if (transactionId) lines.push(`Txn ID  : ${transactionId}`);
  if (chequeNo) {
    lines.push(`Cheque  : ${chequeNo}${bankName ? ` - ${bankName}` : ""}`);
  }
  if (receivedBy) lines.push(`Recv by : ${receivedBy}`);
  if (remarks) lines.push(`Remarks : ${remarks}`);
  if (refundReason) lines.push(`Reason  : ${refundReason}`);
  if (refundedBy) lines.push(`By      : ${refundedBy}`);
  const baseDetails = lines.join("\n");

  const baseLabel =
    entryType === "Income"
      ? `Fee Payment - ${studentName}${installmentNumber ? ` (Inst. #${installmentNumber})` : ""}`
      : `Fee Refund - ${studentName}`;

  const normalizedBreakdown = Array.isArray(entryBreakdown)
    ? entryBreakdown
        .map((item) => ({
          headName: String(item?.headName || "").trim(),
          amount: Number(item?.amount || 0),
          labelSuffix: String(item?.labelSuffix || "").trim(),
          detailsSuffix: String(item?.detailsSuffix || "").trim(),
        }))
        .filter((item) => item.headName && item.amount > 0)
    : [];

  const entriesToCreate =
    normalizedBreakdown.length > 0
      ? normalizedBreakdown
      : [
          {
            headName:
              preferredHeadName ||
              (entryType === "Income" ? "Course Fees" : "Fees Refund"),
            amount: Number(amount),
            labelSuffix: "",
            detailsSuffix: "",
          },
        ];

  const direction = entryType === "Income" ? 1 : -1;

  for (const entry of entriesToCreate) {
    const headDesc =
      entryType === "Income"
        ? "Student course / tuition fee income"
        : "Student fee refund expense";
    const head = await resolveOrCreateHead(txnType._id, entry.headName, headDesc);
    const transactionNo = await generateTransactionNo();
    const label = entry.labelSuffix
      ? `${baseLabel} - ${entry.labelSuffix}`
      : baseLabel;
    const details = entry.detailsSuffix
      ? `${baseDetails}\nHead    : ${entry.detailsSuffix}`
      : baseDetails;

    const txn = new AccountingTransaction({
      transactionNo,
      name: label,
      type: txnType._id,
      head: head._id,
      paymentMethod: method._id,
      paymentDate: new Date(paymentDate),
      amount: Number(entry.amount),
      billReference: receiptNo || voucherNo || "",
      details,
    });
    await txn.save();
    await adjustBalance(method._id, Number(entry.amount), direction);
  }
};
