import api from "../api/axiosInstance";

// Get all holidays (full list with batch details)
// params: { from, to, type, batchId }
export const getHolidays = async (params = {}) => {
  const response = await api.get("/holiday", { params });
  return response.data;
};

// Lightweight: get holiday dates for a date range + batch (for date-picker disabling)
// Returns: [{ date: "YYYY-MM-DD", name, type, reason }]
export const getHolidayDates = async (from, to, batchId) => {
  const response = await api.get("/holiday/dates", {
    params: { from, to, batchId },
  });
  return response.data;
};

// Get working days for a batch in a month, excluding holidays
export const getWorkingDaysWithHolidays = async (batchId, year, month) => {
  const response = await api.get(`/holiday/working-days/${batchId}`, {
    params: { year, month },
  });
  return response.data;
};

// Create a new holiday
export const createHoliday = async (data) => {
  const response = await api.post("/holiday", data);
  return response.data;
};

// Update an existing holiday
export const updateHoliday = async (id, data) => {
  const response = await api.put(`/holiday/${id}`, data);
  return response.data;
};

// Soft-delete a holiday
export const deleteHoliday = async (id) => {
  const response = await api.delete(`/holiday/${id}`);
  return response.data;
};

// Seed Pakistan government holidays (run once from admin panel)
export const seedGovernmentHolidays = async () => {
  const response = await api.post("/holiday/seed-government");
  return response.data;
};
