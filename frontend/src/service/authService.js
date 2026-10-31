import apiClient, { API_ROOT } from "./apiClient";

const setupStatus = async (signal) => {
  const { data } = await apiClient.get("/auth/setup-status", {
    baseURL: API_ROOT,
    signal,
  });
  return data;
};

const register = async (adminData) => {
  const { data } = await apiClient.post("/auth/register", adminData, {
    baseURL: API_ROOT,
  });
  return data;
};

const login = async (email, password) => {
  const { data } = await apiClient.post(
    "/auth/login",
    { email, password },
    { baseURL: API_ROOT }
  );
  return data;
};

const logout = async () => {
  const { data } = await apiClient.post(
    "/auth/logout",
    {},
    { baseURL: API_ROOT }
  );
  return data;
};

const me = async (signal) => {
  const { data } = await apiClient.get("/auth/me", {
    baseURL: API_ROOT,
    signal,
  });
  return data;
};

const authService = { setupStatus, register, login, logout, me };

export default authService;
