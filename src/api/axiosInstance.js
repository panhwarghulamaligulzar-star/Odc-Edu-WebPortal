import axios from "axios";
import useZustandStore from "../stores/zustandStore";

// In local development, always use the local backend to avoid auth/session
// mismatches with the production API.
const baseURL = import.meta.env.DEV
  ? import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5028"
  : import.meta.env.VITE_API_URL || window.location.origin;

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
