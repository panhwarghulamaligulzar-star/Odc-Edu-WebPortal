// routes/accountingRoute.js
import express from "express";
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
} from "../controller/accountingController.js";

const accountingRoute = express.Router();

// Accounting Types
accountingRoute.get("/types", getAccountingTypes);

// Heads of Account
accountingRoute.get("/heads", getHeadsOfAccount);
accountingRoute.post("/heads", createHeadOfAccount);
accountingRoute.put("/heads/:id", updateHeadOfAccount);
accountingRoute.delete("/heads/:id", deleteHeadOfAccount);

// Payment Methods (Banks & Cash)
accountingRoute.get("/payment-methods", getPaymentMethods);
accountingRoute.post("/payment-methods", createPaymentMethod);
accountingRoute.put("/payment-methods/:id", updatePaymentMethod);
accountingRoute.delete("/payment-methods/:id", deletePaymentMethod);

// Transactions — summary MUST be before /:id to avoid route conflict
accountingRoute.get("/transactions/summary", getTransactionSummary);
accountingRoute.get("/transactions", getTransactions);
accountingRoute.get("/transactions/:id", getTransactionById);
accountingRoute.post("/transactions", createTransaction);
accountingRoute.put("/transactions/:id", updateTransaction);
accountingRoute.delete("/transactions/:id", deleteTransaction);

// Fund Transfers
accountingRoute.get("/fund-transfers", getFundTransfers);
accountingRoute.post("/fund-transfers", createFundTransfer);
accountingRoute.delete("/fund-transfers/:id", deleteFundTransfer);

// Ledger
accountingRoute.get("/ledger/:paymentMethodId", getLedger);

// Profit & Loss
accountingRoute.get("/profit-loss", getProfitLoss);

// Monthly Summary
accountingRoute.get("/monthly-summary", getMonthlySummary);

// Receipt / Dues Tracking
accountingRoute.get("/receipts/dues", getReceiptDuesOverview);
accountingRoute.get("/receipts/dues/export", exportReceiptDues);

export default accountingRoute;
