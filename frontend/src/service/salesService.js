import apiClient from "./apiClient";

export const salesService = {
  // Create a new sale
  createSale: async (saleData) => {
    const response = await apiClient.post(
      "/sales/sales-info",
      saleData
    );

    return response.data;
  },

  // Get all sales
  getAllSales: async () => {
    const response = await apiClient.get("/sales/sales-info");

    return response.data;
  },

  // Get a particular sale by ID
  getSaleById: async (id) => {
    const response = await apiClient.get(
      `/sales/sales-info/${id}`
    );

    return response.data;
  },

    // Get sales history with optional filters
  getSalesHistory: async (filters = {}) => {
    const response = await apiClient.get("/sales/sales-history", {
      params: filters,
    });

    return response.data;
  },

  // update the sale data 
  updateSale: async (id, saleData) => {
  const response = await apiClient.put(
    `/sales/sales-info/${id}`,
    saleData
  );

  return response.data;
},
};

export default salesService;