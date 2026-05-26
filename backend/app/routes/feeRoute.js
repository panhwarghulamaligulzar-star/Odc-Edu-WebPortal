// routes/feeRoute.js
import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";
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
router.post("/structure", authMiddleware, authorize("accounting", "create"), createOrUpdateFeeStructure);
router.put(
  "/structure/:feeStructureId/installment/:installmentId",
  authMiddleware,
  authorize("accounting", "update"),
  updateInstallmentStatus,
);
router.get("/structure", authMiddleware, authorize("accounting", "view"), getAllFeeStructures);
router.get("/structure/student/:studentId", authMiddleware, authorize("accounting", "view"), getStudentFeeStructures);
router.get("/structure/:studentId/:courseId", authMiddleware, authorize("accounting", "view"), getFeeStructure);

// Payment Routes
router.post("/payment", authMiddleware, authorize("accounting", "create"), recordFeePayment);
router.get("/payment", authMiddleware, authorize("accounting", "view"), getAllPayments);
router.get("/payment/student/:studentId", authMiddleware, authorize("accounting", "view"), getStudentPaymentHistory);
router.get("/payment/:paymentId/receipt", authMiddleware, authorize("accounting", "print"), getPaymentReceipt);
router.put("/payment/:paymentId", authMiddleware, authorize("accounting", "update"), updatePaymentStatus);
router.post("/payment/:paymentId/refund", authMiddleware, authorize("accounting", "approve"), processRefund);
router.get("/payment/voucher/next", authMiddleware, authorize("accounting", "view"), getNextVoucherNumber);

// Refund calculation
router.post("/refund/calculate/:studentId/:courseId", authMiddleware, authorize("accounting", "view"), calculateRefundAmount);

export default router;
