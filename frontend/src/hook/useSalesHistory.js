import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSalesContext } from "../context/SalesContext";

const PAGE_SIZE = 10;

const useSalesHistory = () => {
  const {
    salesHistory = [],
    fetchingHistory = false,
    error,
    fetchSalesHistory,
    clearError,
  } = useSalesContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("All");
  const [paymentMethod, setPaymentMethod] = useState("All");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [dateError, setDateError] = useState("");

  // Load all history without date restrictions
  const loadAllSalesHistory = useCallback(() => {
    setDateError("");
    return fetchSalesHistory({});
  }, [fetchSalesHistory]);

  // Load history using the selected date range
  const loadSalesHistory = useCallback(async () => {
    if (startDate && endDate && startDate > endDate) {
      const message = "Start date cannot be after end date.";
      setDateError(message);
      throw new Error(message);
    }

    setDateError("");

    const params = {};

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return fetchSalesHistory(params);
  }, [startDate, endDate, fetchSalesHistory]);

  // Reset filters and reload complete history
  const resetHistoryFilters = useCallback(async () => {
    setSearchTerm("");
    setPaymentStatus("All");
    setPaymentMethod("All");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    setDateError("");

    clearError();

    return fetchSalesHistory({});
  }, [fetchSalesHistory, clearError]);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentStatus, paymentMethod]);

  // Search and filter history
  const filteredSales = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return salesHistory.filter((sale) => {
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

      const matchesStatus =
        paymentStatus === "All" ||
        sale.paymentStatus === paymentStatus;

      const matchesMethod =
        paymentMethod === "All" ||
        sale.paymentMethod === paymentMethod;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [salesHistory, searchTerm, paymentStatus, paymentMethod]);

  // Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSales.length / PAGE_SIZE)
  );

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
      setCurrentPage(
        Math.min(Math.max(1, page), totalPages)
      );
    },
    [totalPages]
  );

  // Summary for the currently filtered records
  const summary = useMemo(
    () =>
      filteredSales.reduce(
        (result, sale) => {
          result.totalTransactions += 1;
          result.totalSales += Number(sale.totalAmount) || 0;
          result.amountReceived += Number(sale.amountReceived) || 0;
          result.remainingBalance +=
            Number(sale.remainingBalance) || 0;

          return result;
        },
        {
          totalTransactions: 0,
          totalSales: 0,
          amountReceived: 0,
          remainingBalance: 0,
        }
      ),
    [filteredSales]
  );

  // Counts for the status tabs
  const statusCounts = useMemo(() => {
    return {
      All: salesHistory.length,
      Paid: salesHistory.filter(
        (sale) => sale.paymentStatus === "Paid"
      ).length,
      Partial: salesHistory.filter(
        (sale) => sale.paymentStatus === "Partial"
      ).length,
      Pending: salesHistory.filter(
        (sale) => sale.paymentStatus === "Pending"
      ).length,
    };
  }, [salesHistory]);

  return {
    salesHistory,
    fetchingHistory,
    error,
    dateError,

    searchTerm,
    setSearchTerm,

    paymentStatus,
    setPaymentStatus,

    paymentMethod,
    setPaymentMethod,

    startDate,
    setStartDate,

    endDate,
    setEndDate,

    loadAllSalesHistory,
    loadSalesHistory,
    resetHistoryFilters,

    filteredSales,
    paginatedSales,

    currentPage,
    setCurrentPage: goToPage,
    totalPages,
    pageSize: PAGE_SIZE,

    summary,
    statusCounts,
  };
};

export default useSalesHistory;
