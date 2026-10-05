import api from "../api/axiosInstance";

export const getTestStudioOptions = async () => {
  try {
    const response = await api.get("/test-studio/options");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const previewTestAssignment = async (payload) => {
  try {
    const response = await api.post("/test-studio/assignments/preview", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getTests = async (params = {}) => {
  try {
    const response = await api.get("/test-studio/tests", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getTestById = async (id) => {
  try {
    const response = await api.get(`/test-studio/tests/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const createTest = async (payload) => {
  try {
    const response = await api.post("/test-studio/tests", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateTest = async (id, payload) => {
  try {
    const response = await api.put(`/test-studio/tests/${id}`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const publishTest = async (id) => {
  try {
    const response = await api.post(`/test-studio/tests/${id}/publish`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const duplicateTest = async (id) => {
  try {
    const response = await api.post(`/test-studio/tests/${id}/duplicate`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deleteTest = async (id) => {
  try {
    const response = await api.delete(`/test-studio/tests/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getQuestionBank = async (params = {}) => {
  try {
    const response = await api.get("/test-studio/question-bank", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const importQuestionBank = async ({ file, courseId, topic }) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseId", courseId);
    if (topic) formData.append("topic", topic);
    const response = await api.post("/test-studio/question-bank/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};
