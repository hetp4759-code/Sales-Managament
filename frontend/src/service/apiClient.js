import axios from "axios";


const configuredApiRoot =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:3000/api");

const normalizeApiRoot = (value) => {
  const root = value.trim().replace(/\/+$/, "");
  const apiSuffix = /(?:\/api)+$/i;

  return apiSuffix.test(root) ? root.replace(apiSuffix, "/api") : `${root}/api`;
};

const API_ROOT_URL = normalizeApiRoot(configuredApiRoot);

const apiClient = axios.create({
  baseURL: API_ROOT_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true, // login cookie har request ke saath jayegi
});

export const API_ROOT = API_ROOT_URL;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 && !url.includes("/auth/")) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }

    return Promise.reject(error);
  }
);

export default apiClient;