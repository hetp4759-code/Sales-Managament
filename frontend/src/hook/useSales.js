import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSalesContext } from "../context/SalesContext";

const PAGE_SIZE = 20;

const useSales = () => {
  // ==========================================
  // 1. GET GLOBAL DATA FROM CONTEXT
  // ==========================================

  const {
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
    
    clearError,
    clearSelectedSale
  } = useSalesContext();

  // ==========================================
  // 2. LOCAL MANAGEMENT STATE
  // ==========================================

  const [searchTerm, setSearchTerm] = useState("");

  const [paymentStatus, setPaymentStatus] = useState("All");

  const [paymentMethod, setPaymentMethod] = useState("All");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  // ==========================================
  // 3. RESET PAGE WHEN FILTERS CHANGE
  // ==========================================

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    paymentStatus,
    paymentMethod,
    startDate,
    endDate,
  ]);

  // ==========================================
  // 4. LOAD SALES
  // ==========================================

  const loadSales = useCallback(async () => {
    return fetchAllSales();
  }, [fetchAllSales]);

  // ==========================================
  // 5. CREATE SALE
  // ==========================================

  const addSale = useCallback(
    async (saleData) => {
      return createSale(saleData);
    },
    [createSale]
  );

  // ==========================================
  // 6. LOAD SINGLE SALE
  // ==========================================

  const loadSaleById = useCallback(
    async (id) => {
      return fetchSaleById(id);
    },
    [fetchSaleById]
  );

  // ==========================================
  // 7. LOAD DATE-RANGE HISTORY
  // ==========================================

  const loadSalesHistory = useCallback(async () => {
    const params = {};

    if (startDate) {
      params.startDate = startDate;
    }

    if (endDate) {
      params.endDate = endDate;
    }

    return fetchSalesHistory(params);
  }, [startDate, endDate, fetchSalesHistory]);

  // ==========================================
  // 8. SEARCH AND FILTER SALES
  // ==========================================

  const filteredSales = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return sales.filter((sale) => {
      const searchableValues = [
        sale.sellerName,
        sale.buyerName,
        sale.buyerPhone,
        sale.productName,
      ];

      const matchesSearch =
        !search ||
        searchableValues.some((value) =>
          String(value ?? "").toLowerCase().includes(search)
        );

      const matchesPaymentStatus =
        paymentStatus === "All" ||
        sale.paymentStatus === paymentStatus;

      const matchesPaymentMethod =
        paymentMethod === "All" ||
        sale.paymentMethod === paymentMethod;

      return (
        matchesSearch &&
        matchesPaymentStatus &&
        matchesPaymentMethod
      );
    });
  }, [sales, searchTerm, paymentStatus, paymentMethod]);

  // ==========================================
  // 9. PAGINATION
  // ==========================================

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSales.length / PAGE_SIZE)
  );

  // Prevent an invalid page if the result count changes
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedSales = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredSales.slice(
      startIndex,
      startIndex + PAGE_SIZE
    );
  }, [filteredSales, currentPage]);

  const goToPage = useCallback(
    (page) => {
      const safePage = Math.min(
        Math.max(1, page),
        totalPages
      );

      setCurrentPage(safePage);
    },
    [totalPages]
  );

  // ==========================================
  // 10. SUMMARY CALCULATIONS
  // ==========================================

  const summary = useMemo(() => {
    return filteredSales.reduce(
      (result, sale) => {
        const totalAmount = Number(sale.totalAmount) || 0;
        const amountReceived = Number(sale.amountReceived) || 0;
        const remainingBalance =
          Number(sale.remainingBalance) || 0;

        result.totalTransactions += 1;
        result.totalSales += totalAmount;
        result.amountReceived += amountReceived;
        result.remainingBalance += remainingBalance;

        return result;
      },
      {
        totalTransactions: 0,
        totalSales: 0,
        amountReceived: 0,
        remainingBalance: 0,
      }
    );
  }, [filteredSales]);

  // ==========================================
  // 11. RETURN DATA AND LOGIC
  // ==========================================

  return {
    // Global data
    sales,
    selectedSale,
    loading,
    error,
    fetchingSales,
    creatingSale,
    fetchingSaleDetails,

    // Common operations from Context
    loadSales,
    addSale,
    loadSaleById,
    clearSelectedSale,
    clearError,

    // History operation
    loadSalesHistory,

    // Search
    searchTerm,
    setSearchTerm,

    // Filters
    paymentStatus,
    setPaymentStatus,

    paymentMethod,
    setPaymentMethod,

    startDate,
    setStartDate,

    endDate,
    setEndDate,

    // Filtered sales
    filteredSales,

    // Pagination
    paginatedSales,
    currentPage,
    setCurrentPage: goToPage,
    totalPages,
    pageSize: PAGE_SIZE,

    // Summary
    summary,
  };
};

export default useSales;