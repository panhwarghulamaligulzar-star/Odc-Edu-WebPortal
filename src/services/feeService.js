import api from "../api/axiosInstance";

// Enrollment Services
export const createEnrollment = async (enrollmentData) => {
  try {
    const response = await api.post("/enrollment", enrollmentData);
    return response.data;
  } catch (error) {
    console.error("Enrollment Creation Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getStudentEnrollments = async (studentId) => {
  try {
    const response = await api.get(`/enrollment/student/${studentId}`);
    return response.data;
  } catch (error) {
    console.error("Get Enrollments Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getCourseEnrollments = async (courseId, status = null) => {
  try {
    const params = status ? { status } : {};
    const response = await api.get(`/enrollment/course/${courseId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get Course Enrollments Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getAllEnrollments = async (filters = {}) => {
  try {
    const response = await api.get("/enrollment", { params: filters });
    return response.data;
  } catch (error) {
    console.error("Get All Enrollments Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateEnrollmentStatus = async (enrollmentId, updateData) => {
  try {
    const response = await api.put(`/enrollment/${enrollmentId}`, updateData);
    return response.data;
  } catch (error) {
    console.error("Update Enrollment Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Fee Structure Services
export const createOrUpdateFeeStructure = async (feeData) => {
  try {
    const response = await api.post("/fee/structure", feeData);
    return response.data;
  } catch (error) {
    console.error("Fee Structure Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getFeeStructure = async (studentId, courseId) => {
  try {
    const response = await api.get(`/fee/structure/${studentId}/${courseId}`);
    return response.data;
  } catch (error) {
    console.error("Get Fee Structure Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getStudentFeeStructures = async (studentId) => {
  try {
    const response = await api.get(`/fee/structure/student/${studentId}`);
    return response.data;
  } catch (error) {
    console.error("Get Student Fee Structures Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getAllFeeStructures = async (filters = {}) => {
  try {
    const response = await api.get("/fee/structure", { params: filters });
    return response.data;
  } catch (error) {
    console.error("Get All Fee Structures Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Payment Services
export const recordFeePayment = async (paymentData) => {
  try {
    const response = await api.post("/fee/payment", paymentData);
    return response.data;
  } catch (error) {
    console.error("Payment Recording Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getStudentPaymentHistory = async (studentId, courseId = null) => {
  try {
    const params = courseId ? { courseId } : {};
    const response = await api.get(`/fee/payment/student/${studentId}`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get Payment History Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getAllPayments = async (filters = {}) => {
  try {
    const response = await api.get("/fee/payment", { params: filters });
    return response.data;
  } catch (error) {
    console.error("Get All Payments Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updatePaymentStatus = async (paymentId, updateData) => {
  try {
    const response = await api.put(`/fee/payment/${paymentId}`, updateData);
    return response.data;
  } catch (error) {
    console.error("Update Payment Status Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Course Services (with teacher assignment)
export const createCourse = async (courseData) => {
  try {
    const response = await api.post("/course/create-course", courseData);
    return response.data;
  } catch (error) {
    console.error("Create Course Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getCourses = async () => {
  try {
    const response = await api.get("/course");
    return response.data;
  } catch (error) {
    console.error("Get Courses Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getCourseById = async (courseId) => {
  try {
    const response = await api.get(`/course/${courseId}`);
    return response.data;
  } catch (error) {
    console.error("Get Course Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateCourse = async (courseId, courseData) => {
  try {
    const response = await api.put(`/course/${courseId}`, courseData);
    return response.data;
  } catch (error) {
    console.error("Update Course Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deleteCourse = async (courseId) => {
  try {
    const response = await api.delete(`/course/${courseId}`);
    return response.data;
  } catch (error) {
    console.error("Delete Course Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Teacher Services
export const createTeacher = async (teacherData) => {
  try {
    // If teacherData contains profile picture, send as FormData
    const formData = new FormData();
    Object.keys(teacherData).forEach((key) => {
      if (key === "courseId") {
        formData.append(key, JSON.stringify(teacherData[key]));
      } else if (key === "profilePicture" && teacherData[key]) {
        // profilePicture will be a File object
        formData.append(key, teacherData[key]);
      } else if (teacherData[key] !== null && teacherData[key] !== undefined) {
        formData.append(key, teacherData[key]);
      }
    });

    const response = await api.post("/teacher/create-teacher", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Create Teacher Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getAllTeachers = async () => {
  try {
    const response = await api.get("/teacher");
    return response.data;
  } catch (error) {
    console.error("Get Teachers Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getTeacherById = async (teacherId) => {
  try {
    const response = await api.get(`/teacher/${teacherId}`);
    return response.data;
  } catch (error) {
    console.error("Get Teacher Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getTeacherCompensationDetails = async (teacherId, params = {}) => {
  try {
    const response = await api.get(`/teacher/${teacherId}/compensation-details`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get Teacher Compensation Details Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateTeacherStudentCompensation = async (teacherId, payload) => {
  try {
    const response = await api.put(
      `/teacher/${teacherId}/compensation-student-amount`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Update Teacher Student Compensation Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateTeacherMonthlySalaryConfig = async (teacherId, payload) => {
  try {
    const response = await api.put(`/teacher/${teacherId}`, payload);
    return response.data;
  } catch (error) {
    console.error("Update Teacher Monthly Salary Config Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateTeacher = async (teacherId, teacherData) => {
  try {
    // If teacherData contains profile picture, send as FormData
    const formData = new FormData();
    Object.keys(teacherData).forEach((key) => {
      if (key === "courseId") {
        formData.append(key, JSON.stringify(teacherData[key]));
      } else if (key === "profilePicture" && teacherData[key]) {
        // profilePicture will be a File object
        formData.append(key, teacherData[key]);
      } else if (teacherData[key] !== null && teacherData[key] !== undefined) {
        formData.append(key, teacherData[key]);
      }
    });

    const response = await api.put(`/teacher/${teacherId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    console.log("Update teacher response:", response);
    return response.data;
  } catch (error) {
    console.error("Update Teacher Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deleteTeacher = async (teacherId) => {
  try {
    const response = await api.delete(`/teacher/${teacherId}`);
    return response.data;
  } catch (error) {
    console.error("Delete Teacher Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const bulkImportCoursesWorkbook = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/course/bulk-import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Bulk Import Courses Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const bulkImportTeachers = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/teacher/bulk-import", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Bulk Import Teachers Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Student Services
export const getAllStudent = async () => {
  try {
    const response = await api.get("/student/admissions");
    return response.data;
  } catch (error) {
    console.error("Get Students Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Payment Receipt Service
export const getPaymentReceipt = async (paymentId) => {
  try {
    const response = await api.get(`/fee/payment/${paymentId}/receipt`);
    return response.data;
  } catch (error) {
    console.error("Get Payment Receipt Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Get next voucher number
export const getNextVoucherNumber = async () => {
  try {
    const response = await api.get(`/fee/payment/voucher/next`);
    return response.data;
  } catch (error) {
    console.error("Get Next Voucher Number Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

// Refund Services
export const processRefund = async (paymentId, refundData) => {
  try {
    const response = await api.post(
      `/fee/payment/${paymentId}/refund`,
      refundData,
    );
    return response.data;
  } catch (error) {
    console.error("Process Refund Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const calculateRefundAmount = async (
  studentId,
  courseId,
  completedMonths,
) => {
  try {
    const response = await api.post(
      `/fee/refund/calculate/${studentId}/${courseId}`,
      {
        completedMonths,
      },
    );
    return response.data;
  } catch (error) {
    console.error("Calculate Refund Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export default {
  createEnrollment,
  getStudentEnrollments,
  getCourseEnrollments,
  getAllEnrollments,
  updateEnrollmentStatus,
  createOrUpdateFeeStructure,
  getFeeStructure,
  getStudentFeeStructures,
  getAllFeeStructures,
  recordFeePayment,
  getStudentPaymentHistory,
  getAllPayments,
  updatePaymentStatus,
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  bulkImportCoursesWorkbook,
  createTeacher,
  getAllTeachers,
  getTeacherById,
  getTeacherCompensationDetails,
  updateTeacher,
  deleteTeacher,
  bulkImportTeachers,
  getAllStudent,
  getPaymentReceipt,
  processRefund,
  calculateRefundAmount,
  getNextVoucherNumber,
};
