/**
 * Installment Calculator Utility
 * Calculates installment breakdown for course enrollment fees
 */

/**
 * Calculate installment plan with proper fee breakdown
 * @param {Object} feeConfig - Fee configuration
 * @param {Number} feeConfig.admissionFee - Admission fee amount
 * @param {Number} feeConfig.courseFee - Course fee amount
 * @param {Number} feeConfig.certificateFee - Certificate fee amount
 * @param {Number} feeConfig.courseDuration - Course duration in months
 * @param {Number} feeConfig.discountOnAdmission - Discount on admission fee
 * @param {Number} feeConfig.discountOnCourseFee - Discount on course fee (applied per month)
 * @param {String} feeConfig.discountType - Type: 'none', 'admission', 'courseFee', 'both'
 * @param {Date} feeConfig.startDate - Enrollment start date
 * @returns {Object} Installment plan with breakdown
 */
export const calculateInstallmentPlan = (feeConfig) => {
  const {
    admissionFee = 0,
    courseFee = 0,
    certificateFee = 0,
    courseDuration = 3,
    discountOnAdmission = 0,
    discountOnCourseFee = 0,
    discountType = "none",
    startDate = new Date(),
  } = feeConfig;

  // Calculate discounted fees
  let finalAdmissionFee = admissionFee;
  let finalCourseFee = courseFee;

  if (discountType === "admission" || discountType === "both") {
    finalAdmissionFee = Math.max(0, admissionFee - discountOnAdmission);
  }

  if (discountType === "courseFee" || discountType === "both") {
    finalCourseFee = Math.max(0, courseFee - discountOnCourseFee);
  }

  // Calculate monthly course fee (rounded to integer)
  const monthlyCourseFee = Math.round(finalCourseFee / courseDuration);

  // Build installment plan
  const installments = [];
  const startDateObj = new Date(startDate);

  // First Installment: Admission Fee + First Month Course Fee
  const firstInstallmentAmount =
    Math.round(finalAdmissionFee) + monthlyCourseFee;
  installments.push({
    installmentNumber: 1,
    description: "Admission Fee + First Month Course Fee",
    feeComponents: {
      admissionFee: Math.round(finalAdmissionFee),
      courseFee: monthlyCourseFee,
      certificateFee: 0,
    },
    amount: Math.round(firstInstallmentAmount),
    dueDate: new Date(startDateObj),
    status: "Pending",
    paidAmount: 0,
  });

  // Middle Installments: Monthly Course Fee (from month 2 to second-to-last month)
  for (let i = 2; i <= courseDuration; i++) {
    const dueDate = new Date(startDateObj);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));

    const isLastMonth = i === courseDuration;

    if (isLastMonth) {
      // Last Installment: Last Month Course Fee + Certificate Fee
      const lastInstallmentAmount =
        monthlyCourseFee + Math.round(certificateFee);
      installments.push({
        installmentNumber: i,
        description: "Last Month Course Fee + Certificate Fee",
        feeComponents: {
          admissionFee: 0,
          courseFee: monthlyCourseFee,
          certificateFee: Math.round(certificateFee),
        },
        amount: Math.round(lastInstallmentAmount),
        dueDate: dueDate,
        status: "Pending",
        paidAmount: 0,
      });
    } else {
      // Middle months: Only monthly course fee
      installments.push({
        installmentNumber: i,
        description: `Month ${i} Course Fee`,
        feeComponents: {
          admissionFee: 0,
          courseFee: monthlyCourseFee,
          certificateFee: 0,
        },
        amount: Math.round(monthlyCourseFee),
        dueDate: dueDate,
        status: "Pending",
        paidAmount: 0,
      });
    }
  }

  // Calculate totals
  const totalBeforeDiscount = admissionFee + courseFee + certificateFee;
  const totalDiscount =
    (discountType === "admission" || discountType === "both"
      ? discountOnAdmission
      : 0) +
    (discountType === "courseFee" || discountType === "both"
      ? discountOnCourseFee
      : 0);
  const totalFee = finalAdmissionFee + finalCourseFee + certificateFee;

  return {
    installments,
    summary: {
      admissionFee,
      courseFee,
      certificateFee,
      totalBeforeDiscount,
      discountOnAdmission:
        discountType === "admission" || discountType === "both"
          ? discountOnAdmission
          : 0,
      discountOnCourseFee:
        discountType === "courseFee" || discountType === "both"
          ? discountOnCourseFee
          : 0,
      totalDiscount,
      finalAdmissionFee,
      finalCourseFee,
      finalCertificateFee: certificateFee,
      totalFee,
      monthlyCourseFee: Math.round(monthlyCourseFee * 100) / 100,
      numberOfInstallments: courseDuration,
      courseDuration,
    },
  };
};

/**
 * Generate receipt number
 * @param {String} prefix - Receipt prefix (e.g., 'RCP')
 * @param {Number} sequenceNumber - Sequence number
 * @param {Date} [paymentDate] - Receipt date used for year/month prefix
 * @returns {String} Receipt number
 */
export const generateReceiptNumber = (
  prefix = "RCP",
  sequenceNumber,
  paymentDate = new Date(),
) => {
  const date = new Date(paymentDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(sequenceNumber).padStart(4, "0");
  return `${prefix}-${year}${month}-${seq}`;
};

/**
 * Calculate refund amount based on payments made
 * @param {Object} refundConfig
 * @param {Number} refundConfig.totalPaid - Total amount paid
 * @param {Number} refundConfig.admissionFee - Admission fee (non-refundable)
 * @param {Number} refundConfig.completedMonths - Number of months completed
 * @param {Number} refundConfig.monthlyCourseFee - Monthly course fee
 * @returns {Object} Refund calculation
 */
export const calculateRefund = (refundConfig) => {
  const { totalPaid, admissionFee, completedMonths, monthlyCourseFee } =
    refundConfig;

  // Admission fee is non-refundable
  // Completed months are non-refundable
  const nonRefundableAmount = admissionFee + completedMonths * monthlyCourseFee;
  const refundableAmount = Math.max(0, totalPaid - nonRefundableAmount);

  return {
    totalPaid,
    nonRefundableAmount,
    refundableAmount,
    breakdown: {
      admissionFee: admissionFee,
      completedMonthsFee: completedMonths * monthlyCourseFee,
      refundableMonthsFee: refundableAmount,
    },
  };
};

export default {
  calculateInstallmentPlan,
  generateReceiptNumber,
  calculateRefund,
};
