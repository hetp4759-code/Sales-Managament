import { useCallback, useEffect, useMemo, useState } from "react";
import dashboardService from "../service/dashboardService"

const DEFAULT_PRESET = "30";
const DEFAULT_LIMIT = 5;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const isCancelled = (error) => error?.code === "ERR_CANCELED";

const useDashboard = () => {
  // Range filter
  const [preset, setPreset] = useState(DEFAULT_PRESET); // "10" | "30" | ... | "custom"
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appliedRange, setAppliedRange] = useState(null); // custom range 
  const [dateError, setDateError] = useState("");

  // Stats (cards + charts)
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");

  // Recent sales table
  const [recentSales, setRecentSales] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_LIMIT,
    totalItems: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // Backend ko kaunsa filter bhejna hai
  const params = useMemo(() => {
    if (preset === "custom") return appliedRange; 
    return { days: Number(preset) };
  }, [preset, appliedRange]);

  /* ---------------- Stats fetch ---------------- */
  useEffect(() => {
    if (!params) return undefined;

    const controller = new AbortController();

    setLoadingStats(true);
    setStatsError("");

    dashboardService
      .getDashboardStats(params, controller.signal)
      .then((data) => setStats(data))
      .catch((error) => {
        if (isCancelled(error)) return;
        setStatsError(getErrorMessage(error, "Failed to load dashboard."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStats(false);
      });

    return () => controller.abort();
  }, [params, refreshKey]);

  /* ---------------- Recent sales fetch ---------------- */
  useEffect(() => {
    const controller = new AbortController();

    setLoadingRecent(true);
    setRecentError("");

    dashboardService
      .getRecentSales({ page, limit, ...(params || {}) }, controller.signal)
      .then((data) => {
        setRecentSales(data.sales || []);
        setPagination(data.pagination);
      })
      .catch((error) => {
        if (isCancelled(error)) return;
        setRecentError(getErrorMessage(error, "Failed to load recent sales."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingRecent(false);
      });

    return () => controller.abort();
  }, [page, limit, params, refreshKey]);

  /* ---------------- Actions ---------------- */
  const changePreset = useCallback((value) => {
    setPreset(value);
    setPage(1);
    setDateError("");
  }, []);

  const applyCustomRange = useCallback(() => {
    if (!customStart || !customEnd) {
      setDateError("Select both start date and end date.");
      return;
    }

    if (customStart > customEnd) {
      setDateError("Start date cannot be after end date.");
      return;
    }

    setDateError("");
    setPage(1);
    setAppliedRange({ startDate: customStart, endDate: customEnd });
  }, [customStart, customEnd]);

  const changeLimit = useCallback((value) => {
    setLimit(Number(value));
    setPage(1);
  }, []);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  return {
    // filter
    preset,
    changePreset,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    applyCustomRange,
    dateError,

    // stats
    stats,
    loadingStats,
    statsError,

    // recent sales
    recentSales,
    pagination,
    loadingRecent,
    recentError,
    setPage,
    changeLimit,

    refresh,
  };
};

export default useDashboard;