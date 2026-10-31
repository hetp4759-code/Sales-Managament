
import { useEffect, useState } from "react";
import useSales from "../../hook/useSales";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusClass = (status) => {
  switch (status) {
    case "Paid":
      return "bg-green-100 text-green-700";
    case "Partial":
      return "bg-yellow-100 text-yellow-700";
    case "Pending":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const SalesHistory = () => {
  const {
    salesHistory,
    fetchingHistory,
    error,
    loadSalesHistory,
    clearError,
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
    paginatedSales,
    filteredSales,
    currentPage,
    setCurrentPage,
    totalPages,
    summary,
    resetFilters,
  } = useSales();

  const [dateError, setDateError] = useState("");

  useEffect(() => {
    loadSalesHistory().catch(() => {
      // API error is available through SalesContext.
    });
  }, [loadSalesHistory]);

  const handleApplyFilters = async () => {
    if (startDate && endDate && startDate > endDate) {
      setDateError("Start date cannot be after end date.");
      return;
    }

    setDateError("");
    clearError();

    try {
      await loadSalesHistory();
    } catch {
      // Display the API error from context.
    }
  };

  const handleReset = async () => {
    resetFilters();
    setDateError("");
    clearError();

    // Reset the server-side date range as well.
    try {
      await loadSalesHistoryWithNoDates();
    } catch {
      // Display the API error from context.
    }
  };

  // Reset date filters without relying on the previous input state.
  const loadSalesHistoryWithNoDates = async () => {
    // The reset function clears local dates asynchronously.
    // This request explicitly loads the complete history.
    try {
      await import("../../service/salesService").then(({ default: service }) =>
        service.getSalesHistory({})
      );
      // Fetch again through context on the next render to synchronize state.
      // Prefer the context-based reset implementation below if needed.
    } catch (err) {
      throw err;
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Sales History
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View, search and track your previous sales.
            </p>
          </div>

          <button
            type="button"
            onClick={handleApplyFilters}
            disabled={fetchingHistory}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fetchingHistory ? "Refreshing..." : "Refresh History"}
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Transactions"
            value={summary.totalTransactions}
            description="Matching records"
          />
          <SummaryCard
            title="Total Sales"
            value={formatCurrency(summary.totalSales)}
            description="Total transaction value"
          />
          <SummaryCard
            title="Amount Received"
            value={formatCurrency(summary.amountReceived)}
            description="Payments collected"
          />
          <SummaryCard
            title="Remaining Balance"
            value={formatCurrency(summary.remainingBalance)}
            description="Amount still due"
          />
        </div>

        {/* Filters */}
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Search & Filters
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Search sales
              </label>
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buyer, seller, phone, product..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="All">All statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="All">All methods</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                disabled={fetchingHistory}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Reset
              </button>
            </div>
          </div>

          {dateError && (
            <p className="mt-3 text-sm text-red-600">{dateError}</p>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Transaction Records
            </h2>
            <p className="text-sm text-gray-500">
              {filteredSales.length} record(s) found
            </p>
          </div>

          {fetchingHistory && salesHistory.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Loading sales history...
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-medium text-gray-700">
                No sales records found
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Try changing the search or date filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1100px] w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Seller</th>
                      <th className="px-5 py-4">Buyer</th>
                      <th className="px-5 py-4">Phone</th>
                      <th className="px-5 py-4">Product</th>
                      <th className="px-5 py-4">Quantity</th>
                      <th className="px-5 py-4">Total</th>
                      <th className="px-5 py-4">Received</th>
                      <th className="px-5 py-4">Balance</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Method</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {paginatedSales.map((sale) => (
                      <tr
                        key={sale._id}
                        className="transition hover:bg-gray-50"
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {formatDate(sale.saleDate || sale.createdAt)}
                        </td>
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {sale.sellerName || "-"}
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {sale.buyerName || "-"}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {sale.buyerPhone || "-"}
                        </td>
                        <td className="px-5 py-4 text-gray-700">
                          {sale.productName || "-"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                          {sale.quantity ?? "-"} {sale.unit || ""}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                          {formatCurrency(sale.totalAmount)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-green-700">
                          {formatCurrency(sale.amountReceived)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-red-600">
                          {formatCurrency(sale.remainingBalance)}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                              sale.paymentStatus
                            )}`}
                          >
                            {sale.paymentStatus || "-"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {sale.paymentMethod || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, description }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="mt-2 break-words text-2xl font-bold text-gray-900">
      {value}
    </p>
    <p className="mt-1 text-xs text-gray-500">{description}</p>
  </div>
);

export default SalesHistory;
