import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true,
});

export const API_ROOT = apiClient.defaults.baseURL.replace(/\/sales\/?$/, "");

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";

    if (
      error.response?.status === 401 &&
      !requestUrl.includes("/auth/") &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default apiClient;