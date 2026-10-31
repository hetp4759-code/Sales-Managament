
  import { useEffect,useState } from "react";
  import EditSaleDrawer from "../component/saleHistory/EditSaleDrawer";
  import useSalesHistory from "../hook/useSalesHistory";

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

  const statusStyles = {
    Paid: "bg-green-100 text-green-700",
    Partial: "bg-amber-100 text-amber-700",
    Pending: "bg-red-100 text-red-700",
  };



  const SalesHistory = () => {


  const [selectedSale, setSelectedSale] = useState(null);
  const [detailSale, setDetailSale] = useState(null);

    const {
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
      setCurrentPage,
      totalPages,

      summary,
      statusCounts,
    } = useSalesHistory();

    // Load history when the page first mounts
    useEffect(() => {
      loadAllSalesHistory().catch(() => {});
    }, [loadAllSalesHistory]);

    const handleApplyFilters = async (event) => {
      event.preventDefault();

      try {
        await loadSalesHistory();
      } catch {
        // Date validation and API errors are displayed below.
      }
    };

    const handleReset = async () => {
      try {
        await resetHistoryFilters();
      } catch {
        // API error is displayed below.
      }
    };

    return (
      <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="w-full space-y-6">
          {/* Page heading */}
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Sales History
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage and review your previous transactions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadAllSalesHistory().catch(() => {})}
              disabled={fetchingHistory}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {fetchingHistory ? "Loading..." : "Refresh History"}
            </button>
          </header>

          {/* History filters */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Transactions
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Search records or filter them by date and payment method.
              </p>

              <form
                onSubmit={handleApplyFilters}
                className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                <div>
                  <label
                    htmlFor="sales-search"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Search
                  </label>
                  <input
                    id="sales-search"
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buyer, seller, phone, product..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="payment-method"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Payment Method
                  </label>
                  <select
                    id="payment-method"
                    value={paymentMethod}
                    onChange={(event) => setPaymentMethod(event.target.value)}
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
                  <label
                    htmlFor="start-date"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="end-date"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                  <button
                    type="submit"
                    disabled={fetchingHistory}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    Apply Filters
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={fetchingHistory}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Reset
                  </button>
                </div>
              </form>

              {dateError && (
                <p className="mt-3 text-sm text-red-600">{dateError}</p>
              )}

              {error && (
                <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}
            </div>

            {/* Table heading */}
            <div className="flex flex-col gap-1 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <h3 className="font-semibold text-gray-900">
                Sales Records
              </h3>
              <p className="text-sm text-gray-500">
                {filteredSales.length} record(s) found
              </p>
            </div>

            {/* Table content */}
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
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-[1450px] w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Seller</th>
                        <th className="px-5 py-4">Buyer</th>
                        <th className="px-5 py-4">Phone</th>
                        <th className="px-5 py-4">Product</th>
                        <th className="px-5 py-4">Quantity</th>
                        <th className="px-5 py-4">Taxable</th>
                        <th className="px-5 py-4">GST</th>
                        <th className="px-5 py-4">Total</th>
                        <th className="px-5 py-4">Received</th>
                        <th className="px-5 py-4">Balance</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Method</th>
                        <th className="px-5 py-4">Tax details</th>
                        <th className="px-5 py-4">Edit</th>
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
                          <td className="whitespace-nowrap px-5 py-4">
                            {sale.quantity ?? "-"} {sale.unit || ""}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            {sale.taxableAmount == null
                              ? "—"
                              : formatCurrency(sale.taxableAmount)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            {sale.gstRate == null
                              ? "—"
                              : `${sale.gstRate}% · ${formatCurrency(sale.totalGst)}`}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 font-medium">
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
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                statusStyles[sale.paymentStatus] ||
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {sale.paymentStatus || "-"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                            {sale.paymentMethod || "-"}
                          </td>
                          <td className="px-5 py-4">
                            {sale.gstRate == null ? (
                              <span className="text-gray-400">Not recorded</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDetailSale(sale)}
                                className="whitespace-nowrap rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                View breakdown
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => setSelectedSale(sale)}
                              title="Edit sale"
                              aria-label={`Edit sale for ${sale.buyerName || "customer"}`}
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-5 w-5"
                                aria-hidden="true"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </button>
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
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

         {selectedSale && (
        <EditSaleDrawer
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onUpdated={async () => {
            await loadAllSalesHistory(); // refresh table after save
          }}
        />
      )}
      {detailSale && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-gray-950/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sale-tax-title"
        >
          <section className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 id="sale-tax-title" className="text-lg font-bold text-gray-900">
                  Sale GST breakdown
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {detailSale.productName} · {detailSale.buyerName}
                </p>
              </div>
              <button type="button" onClick={() => setDetailSale(null)} className="rounded-lg px-3 py-1.5 text-gray-500 hover:bg-gray-100" aria-label="Close GST details">✕</button>
            </header>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {[
                ["HSN", detailSale.hsnCode || "—"],
                ["GST rate", `${detailSale.gstRate}% (${detailSale.pricingMode || "—"})`],
                ["Taxable amount", formatCurrency(detailSale.taxableAmount)],
                ["CGST", formatCurrency(detailSale.cgstAmount)],
                ["SGST", formatCurrency(detailSale.sgstAmount)],
                ["IGST", formatCurrency(detailSale.igstAmount)],
                ["Total GST", formatCurrency(detailSale.totalGst)],
                ["Invoice total", formatCurrency(detailSale.invoiceTotal ?? detailSale.totalAmount)],
                ["Supply type", detailSale.supplyType || "—"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-gray-500">
              Values are stored transaction snapshots. They are not a GST return or confirmation of tax compliance.
            </p>
          </section>
        </div>
      )}
      </main>
    );
  };

  const SummaryCard = ({ title, value, subtitle }) => (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="mt-2 break-words text-2xl font-bold text-gray-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );

  export default SalesHistory;