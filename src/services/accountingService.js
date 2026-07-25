import api from "../api/axiosInstance";

// ============================================================
// ACCOUNTING TYPES
// ============================================================

export const getAccountingTypes = async () => {
  try {
    const response = await api.get("/accounting/types");
    return response.data;
  } catch (error) {
    console.error("Get Accounting Types Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// ============================================================
// HEADS OF ACCOUNT
// ============================================================

export const getHeadsOfAccount = async (
  typeId = null,
  includeInactive = false,
) => {
  try {
    const params = {};
    if (typeId) params.type = typeId;
    if (includeInactive) params.includeInactive = true;
    const response = await api.get("/accounting/heads", { params });
    return response.data;
  } catch (error) {
    console.error("Get Heads of Account Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const createHeadOfAccount = async (data) => {
  try {
    const response = await api.post("/accounting/heads", data);
    return response.data;
  } catch (error) {
    console.error("Create Head of Account Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateHeadOfAccount = async (id, data) => {
  try {
    const response = await api.put(`/accounting/heads/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Update Head of Account Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deleteHeadOfAccount = async (id) => {
  try {
    const response = await api.delete(`/accounting/heads/${id}`);
    return response.data;
  } catch (error) {
    console.error("Delete Head of Account Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getExpenseHeadEntries = async (filters = {}) => {
  try {
    const response = await api.get("/accounting/expense-head-entries", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error("Get Expense Head Entries Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const createExpenseHeadEntry = async (data) => {
  try {
    const response = await api.post("/accounting/expense-head-entries", data);
    return response.data;
  } catch (error) {
    console.error("Create Expense Head Entry Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateExpenseHeadEntry = async (id, data) => {
  try {
    const response = await api.put(`/accounting/expense-head-entries/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Update Expense Head Entry Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deleteExpenseHeadEntry = async (id) => {
  try {
    const response = await api.delete(`/accounting/expense-head-entries/${id}`);
    return response.data;
  } catch (error) {
    console.error("Delete Expense Head Entry Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// ============================================================
// PAYMENT METHODS (Banks & Cash)
// ============================================================

export const getPaymentMethods = async () => {
  try {
    const response = await api.get("/accounting/payment-methods");
    return response.data;
  } catch (error) {
    console.error("Get Payment Methods Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const createPaymentMethod = async (data) => {
  try {
    const response = await api.post("/accounting/payment-methods", data);
    return response.data;
  } catch (error) {
    console.error("Create Payment Method Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updatePaymentMethod = async (id, data) => {
  try {
    const response = await api.put(`/accounting/payment-methods/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Update Payment Method Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deletePaymentMethod = async (id) => {
  try {
    const response = await api.delete(`/accounting/payment-methods/${id}`);
    return response.data;
  } catch (error) {
    console.error("Delete Payment Method Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// ============================================================
// TRANSACTIONS
// ============================================================

export const getTransactions = async (filters = {}) => {
  try {
    const response = await api.get("/accounting/transactions", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error("Get Transactions Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getTransactionSummary = async (filters = {}) => {
  try {
    const response = await api.get("/accounting/transactions/summary", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error("Get Transaction Summary Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const createTransaction = async (data) => {
  try {
    const response = await api.post("/accounting/transactions", data);
    return response.data;
  } catch (error) {
    console.error("Create Transaction Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateTransaction = async (id, data) => {
  try {
    const response = await api.put(`/accounting/transactions/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Update Transaction Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deleteTransaction = async (id) => {
  try {
    const response = await api.delete(`/accounting/transactions/${id}`);
    return response.data;
  } catch (error) {
    console.error("Delete Transaction Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// ── Fund Transfers ──────────────────────────────────────────

export const getFundTransfers = async (params = {}) => {
  try {
    const response = await api.get("/accounting/fund-transfers", { params });
    return response.data;
  } catch (error) {
    console.error("Get Fund Transfers Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const createFundTransfer = async (data) => {
  try {
    const response = await api.post("/accounting/fund-transfers", data);
    return response.data;
  } catch (error) {
    console.error("Create Fund Transfer Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deleteFundTransfer = async (id) => {
  try {
    const response = await api.delete(`/accounting/fund-transfers/${id}`);
    return response.data;
  } catch (error) {
    console.error("Delete Fund Transfer Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// ── Ledger ──────────────────────────────────────────────────

export const getLedger = async (paymentMethodId, params = {}) => {
  try {
    const response = await api.get(`/accounting/ledger/${paymentMethodId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get Ledger Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getMonthlySummary = async (months = 12) => {
  try {
    const response = await api.get("/accounting/monthly-summary", {
      params: { months },
    });
    return response.data;
  } catch (error) {
    console.error("Get Monthly Summary Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getTeacherPayroll = async (filters = {}) => {
  try {
    const response = await api.get("/accounting/payroll", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error("Get Teacher Payroll Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const payTeacherPayroll = async (teacherId, data) => {
  try {
    const response = await api.post(`/accounting/payroll/${teacherId}/pay`, data);
    return response.data;
  } catch (error) {
    console.error("Pay Teacher Payroll Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getSuperAdminFinanceMonitor = async (params = {}) => {
  try {
    const response = await api.get("/accounting/super-admin/monitor", {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get Super Admin Finance Monitor Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// ── Profit & Loss ───────────────────────────────────────────

export const getProfitLoss = async (filters = {}) => {
  try {
    const response = await api.get("/accounting/profit-loss", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error("Get Profit/Loss Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getReceiptDuesOverview = async (filters = {}) => {
  try {
    const response = await api.get("/accounting/receipts/dues", {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error("Get Receipt Dues Overview Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const exportReceiptDues = async (filters = {}) => {
  try {
    const response = await api.get("/accounting/receipts/dues/export", {
      params: filters,
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    console.error("Export Receipt Dues Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};
