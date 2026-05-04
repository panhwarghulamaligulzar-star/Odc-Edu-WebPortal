import api from "../api/axiosInstance";

export const adminLogin = async (data) => {
  try {
    const response = await api.post("/auth/user-login", data);
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Login Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const createNewAdmin = async (newAdmin) => {
  try {
    const response = await api.post("/auth/user-signup", newAdmin);
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Login Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};







