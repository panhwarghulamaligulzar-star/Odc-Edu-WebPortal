import api from "../api/axiosInstance";

export const getAdminInformation = async (userId) => {
  try {
    const response = await api.get(`/user/account-info/${userId}`);
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Login Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getAllAdminInfo = async () => {
  try {
    const response = await api.get("/user/getAllProfilesInfo");
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Login Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateAdminInfo = async (id, formData) => {
  try {
    const response = await api.put("/user/account-update/" + id, formData);
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Update Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const deleteAdmin = async (id) => {
  try {
    const response = await api.delete(`/user/account-delete/${id}`);
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Login Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateUserRole = async (id, roleId) => {
  try {
    const response = await api.put(`/user/${id}/role`, { roleId });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const updateUserStatus = async (id, isActive) => {
  try {
    const response = await api.put(`/user/${id}/status`, { isActive });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};

export const getMyPermissions = async () => {
  try {
    const response = await api.get("/user/me/permissions");
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong" };
  }
};
