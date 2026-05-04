import axios from "axios";
import useZustandStore from "../stores/zustandStore";
import { message } from "antd";

// Use environment variable or production URL
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === "production"
    ? window.location.origin
    : "http://localhost:5020");

console.log("Axios baseURL:", baseURL);
console.log("Mode:", import.meta.env.MODE);

const api = axios.create({
  baseURL: baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});
// ======================
// REQUEST INTERCEPTOR
// ======================
api.interceptors.request.use(
  (config) => {
    const token =
      useZustandStore.getState().token || localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ======================
// RESPONSE INTERCEPTOR
// ======================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-logout on 401 errors
    // Just reject the error and let the calling function handle it
    return Promise.reject(error);
  },
);

export default api;
