// routes/accountingRoute.js
import express from "express";
import authMiddleware from "../midlewear/authMiddleware.js";
import authorize from "../midlewear/authorize.js";
import requireAuth from "../midlewear/requireAuth.js";
import superAdminOnly from "../midlewear/superAdminOnly.js";
import {
  getAccountingTypes,
  getHeadsOfAccount,
  createHeadOfAccount,
  updateHeadOfAccount,
  deleteHeadOfAccount,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getTransactions,
  getTransactionSummary,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFundTransfers,
  createFundTransfer,
  deleteFundTransfer,
  getLedger,
  getProfitLoss,
  getMonthlySummary,
  getReceiptDuesOverview,
  exportReceiptDues,
  getSuperAdminFinanceMonitor,
  getTeacherPayrollSummary,
  payTeacherPayroll,
  getExpenseHeadEntries,
  createExpenseHeadEntry,
  updateExpenseHeadEntry,
  deleteExpenseHeadEntry,
} from "../controller/accountingController.js";

const accountingRoute = express.Router();

// Accounting Types
accountingRoute.get("/types", authMiddleware, authorize("accounting", "view"), getAccountingTypes);

// Heads of Account
accountingRoute.get("/heads", authMiddleware, authorize("accounting", "view"), getHeadsOfAccount);
accountingRoute.post("/heads", authMiddleware, authorize("accounting", "create"), createHeadOfAccount);
accountingRoute.put("/heads/:id", authMiddleware, authorize("accounting", "update"), updateHeadOfAccount);
accountingRoute.delete("/heads/:id", authMiddleware, authorize("accounting", "delete"), deleteHeadOfAccount);

// Expense Head Entries
accountingRoute.get("/expense-head-entries", authMiddleware, authorize("accounting", "view"), getExpenseHeadEntries);
accountingRoute.post("/expense-head-entries", authMiddleware, authorize("accounting", "create"), createExpenseHeadEntry);
accountingRoute.put("/expense-head-entries/:id", authMiddleware, authorize("accounting", "update"), updateExpenseHeadEntry);
accountingRoute.delete("/expense-head-entries/:id", authMiddleware, authorize("accounting", "delete"), deleteExpenseHeadEntry);

// Payment Methods (Banks & Cash)
accountingRoute.get("/payment-methods", authMiddleware, authorize("accounting", "view"), getPaymentMethods);
accountingRoute.post("/payment-methods", authMiddleware, authorize("accounting", "create"), createPaymentMethod);
accountingRoute.put("/payment-methods/:id", authMiddleware, authorize("accounting", "update"), updatePaymentMethod);
accountingRoute.delete("/payment-methods/:id", authMiddleware, authorize("accounting", "delete"), deletePaymentMethod);

// Payroll
accountingRoute.get("/payroll", authMiddleware, authorize("accounting", "view"), getTeacherPayrollSummary);
accountingRoute.post("/payroll/:id/pay", authMiddleware, authorize("accounting", "create"), payTeacherPayroll);

// Transactions — summary MUST be before /:id to avoid route conflict
accountingRoute.get("/transactions/summary", authMiddleware, authorize("accounting", "view"), getTransactionSummary);
accountingRoute.get("/transactions", authMiddleware, authorize("accounting", "view"), getTransactions);
accountingRoute.get("/transactions/:id", authMiddleware, authorize("accounting", "view"), getTransactionById);
accountingRoute.post("/transactions", authMiddleware, authorize("accounting", "create"), createTransaction);
accountingRoute.put("/transactions/:id", authMiddleware, authorize("accounting", "update"), updateTransaction);
accountingRoute.delete("/transactions/:id", authMiddleware, authorize("accounting", "delete"), deleteTransaction);

// Fund Transfers
accountingRoute.get("/fund-transfers", authMiddleware, authorize("accounting", "view"), getFundTransfers);
accountingRoute.post("/fund-transfers", authMiddleware, authorize("accounting", "create"), createFundTransfer);
accountingRoute.delete("/fund-transfers/:id", authMiddleware, authorize("accounting", "delete"), deleteFundTransfer);

// Ledger
accountingRoute.get("/ledger/:paymentMethodId", authMiddleware, authorize("accounting", "view"), getLedger);

// Profit & Loss
accountingRoute.get("/profit-loss", authMiddleware, authorize("accounting", "view"), getProfitLoss);

// Monthly Summary
accountingRoute.get("/monthly-summary", authMiddleware, authorize("accounting", "view"), getMonthlySummary);

// Super Admin Finance Monitor
accountingRoute.get(
  "/super-admin/monitor",
  authMiddleware,
  requireAuth,
  superAdminOnly,
  getSuperAdminFinanceMonitor,
);

// Receipt / Dues Tracking
accountingRoute.get("/receipts/dues", authMiddleware, authorize("accounting", "view"), getReceiptDuesOverview);
accountingRoute.get("/receipts/dues/export", authMiddleware, authorize("accounting", "export"), exportReceiptDues);

export default accountingRoute;
