import api from "../api/axiosInstance";

// Get all batches
export const getAllBatches = async (params = {}) => {
  try {
    const response = await api.get("/batch", { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching batches:", error);
    throw error;
  }
};

// Get batches by course
export const getBatchesByCourse = async (courseId) => {
  try {
    const response = await api.get(`/batch/course/${courseId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching batches by course:", error);
    throw error;
  }
};

// Get batch by ID
export const getBatchById = async (batchId) => {
  try {
    const response = await api.get(`/batch/${batchId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching batch:", error);
    throw error;
  }
};

// Create a new batch
export const createBatch = async (batchData) => {
  try {
    const response = await api.post("/batch", batchData);
    return response.data;
  } catch (error) {
    console.error("Error creating batch:", error);
    throw error;
  }
};

// Update a batch
export const updateBatch = async (batchId, batchData) => {
  try {
    const response = await api.put(`/batch/${batchId}`, batchData);
    return response.data;
  } catch (error) {
    console.error("Error updating batch:", error);
    throw error;
  }
};

// Delete a batch
export const deleteBatch = async (batchId) => {
  try {
    const response = await api.delete(`/batch/${batchId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting batch:", error);
    throw error;
  }
};

// Deactivate a batch
export const deactivateBatch = async (batchId) => {
  try {
    const response = await api.patch(`/batch/${batchId}/deactivate`);
    return response.data;
  } catch (error) {
    console.error("Error deactivating batch:", error);
    throw error;
  }
};
