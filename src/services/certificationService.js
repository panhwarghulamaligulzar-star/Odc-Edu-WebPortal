import api from "../api/axiosInstance";

// Create certifications
export const createCertification = async (data) => {
  // console.log("data", data)
  try {
    const response = await api.post("/student/certificates", data);
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Login Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getCertification = async (data) => {
  console.log("data", data);
  try {
    const response = await api.get("/student/certificates");
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Login Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Update certification certifications
export const updateCertification = async (id, data) => {
  try {
    const response = await api.put(`/student/certificate/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Update Certification Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Update certification certifications
export const deleteCertification = async (id, data) => {
  try {
    const response = await api.delete(`/student/certificate/${id}`, data);
    return response.data;
  } catch (error) {
    console.error("Update Certification Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getCertificationByCourseId = async (courseId) => {
  try {
    const respance = await api.get(`/student/certificate/${courseId}`);
    return respance.data;
  } catch (error) {
    return error;
  }
};

// Bulk create certifications
// export const bulkCreateCertification = async (data) => {
//   try {
//     const response = await api.post("/student/certificates/bulk", data);
//     return response.data;
//   } catch (error) {
//     throw error.response?.data || { message: "Something went wrong" };
//   }
// };

// NEW FUNCTION - Bulk upload certifications from Excel
export const bulkUploadCertifications = async (certificationsData) => {
  try {
    const response = await api.post("/student/bulk-upload", certificationsData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get all students (admissions)
export const getAllStudent = async () => {
  try {
    const response = await api.get("/user/get-all-admissions");
    return response.data;
  } catch (error) {
    console.error("Get Students Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};
