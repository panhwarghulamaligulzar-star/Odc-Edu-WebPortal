import api from "../api/axiosInstance";

export const getRoles = async () => {
  const response = await api.get("/roles");
  return response.data;
};

export const getRoleById = async (id) => {
  const response = await api.get(`/roles/${id}`);
  return response.data;
};

export const createRole = async (payload) => {
  const response = await api.post("/roles", payload);
  return response.data;
};

export const updateRole = async (id, payload) => {
  const response = await api.put(`/roles/${id}`, payload);
  return response.data;
};

export const deleteRole = async (id) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};
