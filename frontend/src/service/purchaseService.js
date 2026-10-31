import apiClient from "./apiClient";

const purchaseService = {
  getPurchases: async (params = {}) => {
    const { data } = await apiClient.get("/purchases", { params });
    return data;
  },
  getPurchase: async (id) => {
    const { data } = await apiClient.get(`/purchases/${id}`);
    return data;
  },
  createPurchase: async (purchase) => {
    const { data } = await apiClient.post("/purchases", purchase);
    return data;
  },
  updatePurchase: async (id, updates) => {
    const { data } = await apiClient.patch(`/purchases/${id}`, updates);
    return data;
  },
  receivePurchase: async (id) => {
    const { data } = await apiClient.post(`/purchases/${id}/receive`);
    return data;
  },
  updatePayment: async (id, payment) => {
    const { data } = await apiClient.patch(`/purchases/${id}/payment`, payment);
    return data;
  },
};

export default purchaseService;
