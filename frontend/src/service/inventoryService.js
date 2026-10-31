import apiClient from "./apiClient";

const inventoryService = {
  getBusinessProfile: async (signal) => {
    const { data } = await apiClient.get("/inventory/business-profile", {
      signal,
    });
    return data;
  },
  saveBusinessProfile: async (profile) => {
    const { data } = await apiClient.patch(
      "/inventory/business-profile",
      profile
    );
    return data;
  },
  getProducts: async (params = {}) => {
    const { data } = await apiClient.get("/inventory/products", { params });
    return data;
  },
  createProduct: async (product) => {
    const { data } = await apiClient.post("/inventory/products", product);
    return data;
  },
  updateProduct: async (id, updates) => {
    const { data } = await apiClient.put(`/inventory/products/${id}`, updates);
    return data;
  },
  adjustStock: async (id, adjustment) => {
    const { data } = await apiClient.post(
      `/inventory/products/${id}/stock-adjustments`,
      adjustment
    );
    return data;
  },
  getMovements: async (params = {}) => {
    const { data } = await apiClient.get("/inventory/movements", { params });
    return data;
  },
};

export default inventoryService;
