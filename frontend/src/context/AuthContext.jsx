import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import authService from "../service/authService";
import inventoryService from "../service/inventoryService";
import AuthContext from "./authContextStore";

const getSessionError = (error) =>
  error.response?.data?.message ||
  (error.response
    ? "Unable to verify your session. Please try again."
    : "Cannot reach the server. Check your connection and try again.");

const getBusinessProfileError = (error) =>
  error.response?.data?.message ||
  (error.response
    ? "Unable to verify business setup. Please try again."
    : "Cannot reach the server to verify business setup.");

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [businessProfile, setBusinessProfile] = useState(null);
  const [businessProfileLoading, setBusinessProfileLoading] = useState(false);
  const [businessProfileError, setBusinessProfileError] = useState("");

  const refreshBusinessProfile = useCallback(async (signal) => {
    setBusinessProfileLoading(true);
    setBusinessProfileError("");
    try {
      const response = await inventoryService.getBusinessProfile(signal);
      if (!signal?.aborted) {
        setBusinessProfile(response.profile ?? null);
      }
      return response.profile ?? null;
    } catch (error) {
      if (!signal?.aborted) {
        setBusinessProfile(null);
        setBusinessProfileError(getBusinessProfileError(error));
      }
      return null;
    } finally {
      if (!signal?.aborted) setBusinessProfileLoading(false);
    }
  }, []);

  const checkSession = useCallback(async (signal) => {
    try {
      const response = await authService.me(signal);
      if (!signal?.aborted) {
        const currentAdmin = response.admin ?? null;
        setAdmin(currentAdmin);
        if (currentAdmin) {
          await refreshBusinessProfile(signal);
        } else {
          setBusinessProfile(null);
          setBusinessProfileError("");
          setBusinessProfileLoading(false);
        }
      }
    } catch (error) {
      if (signal?.aborted) return;

      setAdmin(null);
      setBusinessProfile(null);
      setBusinessProfileError("");
      setBusinessProfileLoading(false);
      if (error.response?.status !== 401) {
        setSessionError(getSessionError(error));
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [refreshBusinessProfile]);

  const retrySession = useCallback(() => {
    setLoading(true);
    setSessionError("");
    checkSession();
  }, [checkSession]);

  const retryBusinessProfile = useCallback(
    () => refreshBusinessProfile(),
    [refreshBusinessProfile]
  );

  useEffect(() => {
    const controller = new AbortController();
    const handleUnauthorized = () => {
      setAdmin(null);
      setSessionError("");
      setBusinessProfile(null);
      setBusinessProfileError("");
      setBusinessProfileLoading(false);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    checkSession(controller.signal);

    return () => {
      controller.abort();
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [checkSession]);

  const login = useCallback(async (email, password) => {
    const response = await authService.login(email, password);

    if (response.admin?.role !== "admin") {
      throw new Error("The server returned an invalid admin session.");
    }

    setSessionError("");
    setAdmin(response.admin);
    await refreshBusinessProfile();
    return response.admin;
  }, [refreshBusinessProfile]);

  const register = useCallback(async (adminData) => {
    const response = await authService.register(adminData);

    if (response.admin?.role !== "admin") {
      throw new Error("The server returned an invalid admin session.");
    }

    setSessionError("");
    setAdmin(response.admin);
    await refreshBusinessProfile();
    return response.admin;
  }, [refreshBusinessProfile]);

  const logout = useCallback(async () => {
    await authService.logout();
    setAdmin(null);
    setSessionError("");
    setBusinessProfile(null);
    setBusinessProfileError("");
    setBusinessProfileLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      loading,
      sessionError,
      businessProfile,
      businessProfileLoading,
      businessProfileError,
      register,
      login,
      logout,
      checkSession: retrySession,
      refreshBusinessProfile,
      retryBusinessProfile,
    }),
    [
      admin,
      loading,
      sessionError,
      businessProfile,
      businessProfileLoading,
      businessProfileError,
      register,
      login,
      logout,
      retrySession,
      refreshBusinessProfile,
      retryBusinessProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
