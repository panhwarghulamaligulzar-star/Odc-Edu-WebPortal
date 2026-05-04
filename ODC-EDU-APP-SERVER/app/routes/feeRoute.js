// routes/feeRoute.js
import express from "express";
import {
  createOrUpdateFeeStructure,
  getFeeStructure,
  getStudentFeeStructures,
  recordFeePayment,
  getStudentPaymentHistory,
  getAllFeeStructures,
  updatePaymentStatus,
  getAllPayments,
  updateInstallmentStatus,
  processRefund,
  calculateRefundAmount,
  getPaymentReceipt,
  getNextVoucherNumber,
} from "../controller/feeController.js";

const router = express.Router();

// Fee Structure Routes
router.post("/structure", createOrUpdateFeeStructure);
router.put(
  "/structure/:feeStructureId/installment/:installmentId",
  updateInstallmentStatus,
);
router.get("/structure", getAllFeeStructures);
router.get("/structure/student/:studentId", getStudentFeeStructures);
router.get("/structure/:studentId/:courseId", getFeeStructure);

// Payment Routes
router.post("/payment", recordFeePayment);
router.get("/payment", getAllPayments);
router.get("/payment/student/:studentId", getStudentPaymentHistory);
router.get("/payment/:paymentId/receipt", getPaymentReceipt);
router.put("/payment/:paymentId", updatePaymentStatus);
router.post("/payment/:paymentId/refund", processRefund);
router.get("/payment/voucher/next", getNextVoucherNumber);

// Refund calculation
router.post("/refund/calculate/:studentId/:courseId", calculateRefundAmount);

export default router;
