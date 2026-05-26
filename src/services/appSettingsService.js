import api from "../api/axiosInstance";

const resolveUploadFile = (input) => {
  if (!input) return null;
  if (input instanceof File) return input;
  if (input?.originFileObj instanceof File) return input.originFileObj;
  if (input?.file instanceof File) return input.file;
  if (input?.file?.originFileObj instanceof File) return input.file.originFileObj;
  return null;
};

export const fetchAppSettings = async () => {
  const response = await api.get("/settings");
  return response.data;
};

export const updateAppSettings = async (payload) => {
  const response = await api.put("/settings", payload);
  return response.data;
};

export const uploadBrandingAsset = async (type, file) => {
  const uploadFile = resolveUploadFile(file);
  if (!uploadFile) {
    throw { message: "Please choose a valid image file before uploading." };
  }

  const formData = new FormData();
  formData.append("file", uploadFile, uploadFile.name);
  const response = await api.post(`/settings/${type}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
