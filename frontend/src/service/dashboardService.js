import apiClient from "./apiClient"; 

/*
  params examples:
    { days: 30 }
    { startDate: "2026-10-01", endDate: "2026-10-30" }
*/
const getDashboardStats = async (params, signal) => {
  const { data } = await apiClient.get("/dashboard", {
    params,
    signal,
  });
  return data;
};

const getRecentSales = async ({ page, limit, ...range }, signal) => {
  const { data } = await apiClient.get("/dashboard/recent", {
    params: { page, limit, ...range },
    signal,
  });
  return data;
};

const dashboardService = { getDashboardStats, getRecentSales };

export default dashboardService;