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
  console.log("id", id);
  console.log("formData", formData);

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
  console.log("id", id);
  try {
    const response = await api.delete(`/user/account-delete/${id}`);
    return response.data;
  } catch (error) {
    // Log backend error message
    console.error("Login Error:", error.response?.data);
    throw error.response?.data || { message: "Something went wrong" };
  }
};
