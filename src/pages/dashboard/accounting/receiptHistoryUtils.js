export const buildStudentInstallmentRows = (feeStructures = [], payments = []) => {
  const paymentMap = new Map();

  payments.forEach((payment) => {
    const feeStructureId = String(
      payment?.feeStructure?._id || payment?.feeStructure || "",
    );
    const installmentKey = payment?.installmentNumber
      ? `inst:${payment.installmentNumber}`
      : "full";
    const mapKey = `${feeStructureId}:${installmentKey}`;
    const existing = paymentMap.get(mapKey);
    const paymentTime = new Date(
      payment?.paymentDate || payment?.createdAt || 0,
    ).getTime();
    const existingTime = existing
      ? new Date(existing?.paymentDate || existing?.createdAt || 0).getTime()
      : 0;

    if (!existing || paymentTime >= existingTime) {
      paymentMap.set(mapKey, payment);
    }
  });

  return feeStructures.flatMap((feeStructure) => {
    const course = feeStructure?.course || {};
    const courseId = String(course?._id || feeStructure?.course || "");
    const baseRow = {
      feeStructureId: feeStructure?._id,
      courseId,
      courseName: course?.courseName || "Course",
      courseCode: course?.courseId || "",
      feeStructure,
    };

    if (Array.isArray(feeStructure?.installments) && feeStructure.installments.length) {
      return feeStructure.installments.map((installment) => {
        const paidAmount = Number(installment?.paidAmount || 0);
        const amount = Number(installment?.amount || 0);
        const remainingAmount = Math.max(0, amount - paidAmount);
        const mapKey = `${feeStructure?._id}:inst:${installment.installmentNumber}`;
        const linkedPayment = paymentMap.get(mapKey) || null;

        return {
          _id: `${feeStructure?._id}:${installment.installmentNumber}`,
          ...baseRow,
          description:
            installment?.description || `Installment #${installment.installmentNumber}`,
          installmentNumber: installment?.installmentNumber,
          dueDate: installment?.dueDate || null,
          amount,
          paidAmount,
          remainingAmount,
          status:
            remainingAmount <= 0
              ? "Paid"
              : paidAmount > 0
                ? "Partial"
                : installment?.status || "Pending",
          receiptNo:
            installment?.receiptNumber || linkedPayment?.receiptNo || null,
          voucherNo: installment?.voucherNo || linkedPayment?.voucherNo || null,
          paymentId: linkedPayment?._id || null,
          linkedPayment,
          selectedInstallment: installment,
        };
      });
    }

    const totalFee = Number(feeStructure?.totalFee || 0);
    const paidAmount = Number(feeStructure?.paidAmount || 0);
    const remainingAmount = Math.max(0, totalFee - paidAmount);
    const mapKey = `${feeStructure?._id}:full`;
    const linkedPayment = paymentMap.get(mapKey) || null;

    return [
      {
        _id: `${feeStructure?._id}:full`,
        ...baseRow,
        description: "Full Payment",
        installmentNumber: null,
        dueDate: feeStructure?.createdAt || null,
        amount: totalFee,
        paidAmount,
        remainingAmount,
        status:
          remainingAmount <= 0
            ? "Paid"
            : paidAmount > 0
              ? "Partial"
              : feeStructure?.feeStatus === "Overdue"
                ? "Pending"
                : feeStructure?.feeStatus || "Pending",
        receiptNo: linkedPayment?.receiptNo || null,
        voucherNo: linkedPayment?.voucherNo || null,
        paymentId: linkedPayment?._id || null,
        linkedPayment,
        selectedInstallment: null,
      },
    ];
  });
};
