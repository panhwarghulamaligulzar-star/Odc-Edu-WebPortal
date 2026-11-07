import api from "../api/axiosInstance";

export const adminLogin = async (data) => {
  try {
    const response = await api.post("/auth/user-login", data);
    return response.data;
  } catch (error) {
    console.error("Login Error:", error.response?.data);
    if (error.response?.data?.message) {
      throw error.response.data;
    }
    if (error.response) {
      throw {
        message: `Login request failed (HTTP ${error.response.status}). Please try again.`,
      };
    }
    throw {
      message: "Unable to reach the login server. Check that the backend is running and try again.",
    };
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






