import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import salesService from "../service/salesService";

const SalesContext = createContext(null);

export const SalesProvider = ({ children }) => {
  // ==========================================
  // 1. GLOBAL STATE
  // ==========================================

  const [sales, setSales] = useState([]);
  const [salesHistory, setSalesHistory] = useState([])
  const [selectedSale, setSelectedSale] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Separate loading state for different operations
  const [fetchingSales, setFetchingSales] = useState(false);
  const [fetchingHistory, setFetchingHistory] = useState(false);
  const [creatingSale, setCreatingSale] = useState(false);
  const [updatingSale, setUpdatingSale] = useState(false);
  const [fetchingSaleDetails, setFetchingSaleDetails] =
    useState(false);

  // ==========================================
  // 2. COMMON HELPER FUNCTIONS
  // ==========================================

  const getErrorMessage = (err, fallback) =>
    err.response?.data?.message || err.message || fallback;

  const normalizeSalesResponse = (response) => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.sales)) return response.sales;
    if (Array.isArray(response?.data?.sales)) {
      return response.data.sales;
    }
    if (Array.isArray(response?.data)) return response.data;

    return [];
  };

  // ==========================================
  // 3. FETCH ALL SALES
  // ==========================================

  const fetchAllSales = useCallback(async () => {
    try {
      setFetchingSales(true);
      setLoading(true);
      setError(null);

      const response = await salesService.getAllSales();
      const salesData = normalizeSalesResponse(response);

      setSales(salesData);

      return salesData;
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Failed to fetch sales."
      );

      setError(message);
      throw err;
    } finally {
      setFetchingSales(false);
      setLoading(false);
    }
  }, []);

  // ==========================================
  // 4. CREATE SALE
  // ==========================================

  const createSale = useCallback(async (saleData) => {
    try {
      setCreatingSale(true);
      setLoading(true);
      setError(null);

      const response = await salesService.createSale(saleData);

      const newSale =
        response?.sale ??
        response?.data?.sale ??
        response?.data ??
        response;

      if (newSale?._id) {
        setSales((previousSales) => [
          newSale,
          ...previousSales.filter(
            (sale) => sale._id !== newSale._id
          ),
        ]);
      }

      return response;
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Failed to create sale."
      );

      setError(message);
      throw err;
    } finally {
      setCreatingSale(false);
      setLoading(false);
    }
  }, []);

  // ==========================================
  // 5. FETCH SINGLE SALE BY ID
  // ==========================================

  const fetchSaleById = useCallback(async (id) => {
    try {
      setFetchingSaleDetails(true);
      setLoading(true);
      setError(null);

      const response = await salesService.getSaleById(id);

      const sale =
        response?.sale ??
        response?.data?.sale ??
        response?.data ??
        response;

      setSelectedSale(sale);

      return sale;
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Failed to fetch sale details."
      );

      setError(message);
      throw err;
    } finally {
      setFetchingSaleDetails(false);
      setLoading(false);
    }
  }, []);

  // ==========================================
  // 6. FETCH SALES HISTORY
  // ==========================================

  const fetchSalesHistory = useCallback(async (params = {}) => {
  try {
    setFetchingHistory(true);
    setError(null);

    const response = await salesService.getSalesHistory(params);

    const history = normalizeSalesResponse(response);

    setSalesHistory(history);

    return history;
  } catch (err) {
    const message = getErrorMessage(
      err,
      "Failed to fetch sales history."
    );

    setError(message);
    throw err;
  } finally {
    setFetchingHistory(false);
  }
}, []);

// ==========================================
// UPDATE EXISTING SALE
// ==========================================

const updateSale = useCallback(async (id, saleData) => {
  try {
    setUpdatingSale(true);
    setError(null);

    // Call backend PUT API
    const response = await salesService.updateSale(
      id,
      saleData
    );

    if (response?.success === false) {
      throw new Error(
        response.message || "Failed to update sale."
      );
    }

    // Extract updated sale from API response
    const updatedSale =
      response?.data?.sale ??
      response?.data ??
      response?.sale ??
      response;

    if (!updatedSale?._id) {
      throw new Error(
        "Sale updated, but updated sale data was not returned."
      );
    }

    // Update sales list without fetching everything again
    setSales((previousSales) =>
      previousSales.map((sale) =>
        sale._id === updatedSale._id
          ? { ...sale, ...updatedSale }
          : sale
      )
    );

    // Update sales history
    setSalesHistory((previousHistory) =>
      previousHistory.map((sale) =>
        sale._id === updatedSale._id
          ? { ...sale, ...updatedSale }
          : sale
      )
    );

    // Update currently selected sale if it matches
    setSelectedSale((previousSale) =>
      previousSale?._id === updatedSale._id
        ? { ...previousSale, ...updatedSale }
        : previousSale
    );

    return updatedSale;
  } catch (err) {
    const message = getErrorMessage(
      err,
      "Failed to update sale."
    );

    setError(message);
    throw err;
  } finally {
    setUpdatingSale(false);
  }
}, []);


  // ==========================================
  // 7. CLEAR SELECTED SALE
  // ==========================================

  const clearSelectedSale = useCallback(() => {
    setSelectedSale(null);
  }, []);

  // ==========================================
  // 8. CLEAR ERROR
  // ==========================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==========================================
  // 9. RESET SALES STATE
  // ==========================================

const resetSales = useCallback(() => {
  setSales([]);
  setSalesHistory([]);
  setSelectedSale(null);
  setError(null);
}, []);

  // ==========================================
  // 10. PROVIDER VALUE
  // ==========================================

  const value = useMemo(
    () => ({
      // Global data
      sales,
      setSales,

      selectedSale,
      setSelectedSale,

      // Global loading and error
      loading,
      error,

      fetchingSales,
      creatingSale,
      fetchingSaleDetails,

      // Common API operations
      fetchAllSales,
      createSale,
      fetchSaleById,
      fetchSalesHistory,

      // Utility operations
      clearSelectedSale,
      clearError,
      resetSales,

      // history
      salesHistory,
      fetchingHistory,

      // update
      updateSale
    }),
    [
      sales,
      selectedSale,
      loading,
      error,
      fetchingSales,
      creatingSale,
      fetchingSaleDetails,
      fetchAllSales,
      createSale,
      fetchSaleById,
      fetchSalesHistory,
      clearSelectedSale,
      salesHistory,
      fetchingHistory,
      updateSale,
      clearError,
      resetSales,
    ]
  );

  return (
    <SalesContext.Provider value={value}>
      {children}
    </SalesContext.Provider>
  );
};

// ==========================================
// CUSTOM HOOK TO ACCESS CONTEXT
// ==========================================

export const useSalesContext = () => {
  const context = useContext(SalesContext);

  if (!context) {
    throw new Error(
      "useSalesContext must be used inside SalesProvider."
    );
  }

  return context;
};

export default SalesContext;