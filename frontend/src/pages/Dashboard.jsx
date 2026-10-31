import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EditSaleDrawer from "../component/saleHistory/EditSaleDrawer";
import useDashboard from "../hook/useDashboard";

/* ---------------------------------------------------------------
   Constants & helpers
---------------------------------------------------------------- */

const PRESET_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "10", label: "Last 10 days" },
  { value: "25", label: "Last 25 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
  { value: "custom", label: "Custom range" },
];

const STATUS_COLORS = {
  Paid: "#22a06b",
  Partial: "#f5b335",
  Pending: "#ef5350",
};

const statusStyles = {
  Paid: "bg-green-100 text-green-700",
  Partial: "bg-amber-100 text-amber-700",
  Pending: "bg-red-100 text-red-700",
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const compactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

// "2026-10-28" (backend ki IST date) -> "28 Oct"
const formatShortDay = (value) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const formatFullDay = (value) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const formatSaleDate = (date) => {
  if (!date) return "-";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const getPageNumbers = (page, totalPages) => {
  const maxButtons = 5;
  const end = Math.min(totalPages, Math.max(1, page - 2) + maxButtons - 1);
  const start = Math.max(1, end - maxButtons + 1);

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

/* ---------------------------------------------------------------
   Small UI pieces
---------------------------------------------------------------- */

const Icon = ({ d, className = "h-5 w-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const ICONS = {
  wallet:
    "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M3 10h18 M16 14.5h2",
  cash: "M2 6h20v12H2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  document: "M7 3h8l4 4v14H7z M15 3v4h4 M10 12h6 M10 16h6",
  up: "M12 19V5 M5 12l7-7 7 7",
  down: "M12 5v14 M19 12l-7 7-7-7",
  edit: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
};

const CARD_TONES = {
  blue: { card: "border-blue-100 bg-blue-50/60", icon: "bg-blue-100 text-blue-600" },
  green: { card: "border-green-100 bg-green-50/60", icon: "bg-green-100 text-green-600" },
  amber: { card: "border-amber-100 bg-amber-50/60", icon: "bg-amber-100 text-amber-600" },
  violet: { card: "border-violet-100 bg-violet-50/60", icon: "bg-violet-100 text-violet-600" },
};

const ChangeBadge = ({ value, invert = false }) => {
  if (value === null || value === undefined) {
    return <p className="mt-2 text-xs text-gray-400">No data to compare</p>;
  }

  const isUp = value > 0;
  const isDown = value < 0;
  const isGood = invert ? isDown : isUp;

  let color = "text-gray-500";
  if (isUp || isDown) color = isGood ? "text-green-600" : "text-red-600";

  return (
    <p className="mt-2 flex items-center gap-2 text-sm">
      <span className={`flex items-center gap-1 font-semibold ${color}`}>
        {(isUp || isDown) && (
          <Icon d={isUp ? ICONS.up : ICONS.down} className="h-4 w-4" />
        )}
        {Math.abs(value)}%
      </span>
      <span className="text-xs text-gray-500">vs previous period</span>
    </p>
  );
};

const StatCard = ({ title, value, change, invertChange, tone, icon, loading }) => (
  <div className={`rounded-xl border p-5 shadow-sm ${CARD_TONES[tone].card}`}>
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${CARD_TONES[tone].icon}`}
      >
        <Icon d={icon} />
      </span>
      <p className="text-sm font-medium text-gray-700">{title}</p>
    </div>

    <p
      className={`mt-4 break-words text-2xl font-bold text-gray-900 ${
        loading ? "animate-pulse" : ""
      }`}
    >
      {value}
    </p>

    <ChangeBadge value={change} invert={invertChange} />
  </div>
);

const TrendTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900">{formatFullDay(point.date)}</p>
      <p className="mt-1 text-blue-700">
        Sales: {formatCurrency(point.total)} · {point.count} transaction(s)
      </p>
      <p className="text-violet-700">
        Purchases: {formatCurrency(point.purchaseTotal)} · {point.purchaseCount} received
      </p>
    </div>
  );
};

const SalesOverviewChart = ({ data }) => {
  const showDots = data.length <= 31;
  const hasActivity = data.some(
    (point) => point.total > 0 || point.purchaseTotal > 0
  );

  return (
    <div className="relative h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="purchaseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#eef0f4" vertical={false} />

          <XAxis
            dataKey="date"
            tickFormatter={formatShortDay}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />

          <YAxis
            tickFormatter={compactNumber}
            tick={{ fontSize: 12, fill: "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={48}
            allowDecimals={false}
          />

          <Tooltip content={<TrendTooltip />} />

          <Legend />
          <Area
            type="monotone"
            dataKey="total"
            name="Sales"
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#salesFill)"
            dot={showDots ? { r: 3, fill: "#2563eb", strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
          />
          <Area
            type="monotone"
            dataKey="purchaseTotal"
            name="Purchases"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#purchaseFill)"
            dot={showDots ? { r: 3, fill: "#7c3aed", strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {!hasActivity && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          No sales or received purchases in this period
        </p>
      )}
    </div>
  );
};

const PaymentStatusChart = ({ data, label = "Sales" }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  // 0 count wale slices chart se hata do, warna gap dikhta hai
  const slices = total > 0 ? data.filter((item) => item.count > 0) : [];

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total > 0 ? slices : [{ status: "None", count: 1 }]}
              dataKey="count"
              nameKey="status"
              innerRadius="68%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
            >
              {total > 0 ? (
                slices.map((item) => (
                  <Cell key={item.status} fill={STATUS_COLORS[item.status]} />
                ))
              ) : (
                <Cell fill="#e5e7eb" />
              )}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{total}</span>
          <span className="text-sm text-gray-500">{label}</span>
        </div>
      </div>

      <ul className="w-full max-w-xs space-y-4">
        {data.map((item) => {
          const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";

          return (
            <li key={item.status} className="flex items-center gap-3 text-sm">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[item.status] }}
              />
              <span className="flex-1 font-medium text-gray-800">{item.status}</span>
              <span className="w-8 text-right font-medium text-gray-900">
                {item.count}
              </span>
              <span className="w-14 text-right text-gray-500">{percent}%</span>
              {item.outstanding !== undefined && (
                <span className="hidden text-right text-xs text-gray-500 sm:inline">
                  {formatCurrency(item.outstanding)} due
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/* ---------------------------------------------------------------
   Page
---------------------------------------------------------------- */

const Dashboard = () => {
  const [selectedSale, setSelectedSale] = useState(null);

  const {
    preset,
    changePreset,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    applyCustomRange,
    dateError,

    stats,
    loadingStats,
    statsError,

    recentSales,
    pagination,
    loadingRecent,
    recentError,
    setPage,
    changeLimit,

    refresh,
  } = useDashboard();

  const summary = stats?.summary;
  const change = summary?.change;
  const valueOf = (amount) => (summary ? formatCurrency(amount) : "—");

  const pageNumbers = getPageNumbers(pagination.page, pagination.totalPages);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        {/* Heading + range filter */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Here&apos;s an overview of your sales and business performance.
            </p>
            {stats?.range && (
              <p className="mt-1 text-xs text-gray-400">
                Showing {formatFullDay(stats.range.startDate)} –{" "}
                {formatFullDay(stats.range.endDate)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="range-preset" className="sr-only">
              Date range
            </label>
            <select
              id="range-preset"
              value={preset}
              onChange={(event) => changePreset(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {preset === "custom" && (
              <>
                <input
                  type="date"
                  aria-label="Start date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <span className="text-sm text-gray-400">to</span>
                <input
                  type="date"
                  aria-label="End date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={applyCustomRange}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Apply
                </button>
              </>
            )}
          </div>
        </header>

        {dateError && <p className="text-sm text-red-600">{dateError}</p>}

        {preset === "custom" && !stats && !loadingStats && !statsError && (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            Choose a start date and end date, then press Apply.
          </p>
        )}

        {statsError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          >
            <span>{statsError}</span>
            <button
              type="button"
              onClick={refresh}
              className="rounded-md border border-red-300 px-3 py-1 font-medium hover:bg-red-100"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stat cards */}
        <section
          aria-label="Summary"
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 ${
            loadingStats && stats ? "opacity-60" : ""
          }`}
        >
          <StatCard
            title="Total Sales (selected period)"
            value={valueOf(summary?.totalSales)}
            change={change?.totalSales}
            tone="blue"
            icon={ICONS.wallet}
            loading={loadingStats && !stats}
          />
          <StatCard
            title="Sales Received (selected period)"
            value={valueOf(summary?.totalReceived)}
            change={change?.totalReceived}
            tone="green"
            icon={ICONS.cash}
            loading={loadingStats && !stats}
          />
          <StatCard
            title="Customer Receivable (selected period)"
            value={valueOf(summary?.pendingAmount)}
            change={change?.pendingAmount}
            invertChange
            tone="amber"
            icon={ICONS.clock}
            loading={loadingStats && !stats}
          />
          <StatCard
            title="Sales Transactions (selected period)"
            value={summary ? summary.totalTransactions : "—"}
            change={change?.totalTransactions}
            tone="violet"
            icon={ICONS.document}
            loading={loadingStats && !stats}
          />
        </section>

        <section
          aria-label="Purchases, tax and inventory"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {[
            ["Received purchases (selected period)", valueOf(summary?.totalPurchases)],
            ["Supplier payable (current balance)", valueOf(summary?.overallSupplierPayable)],
            ["Output GST recorded (selected period)", valueOf(summary?.outputGst)],
            ["Input GST recorded (selected period)", valueOf(summary?.inputGst)],
            ["Stock value at purchase cost (current)", stats ? formatCurrency(stats.inventory?.currentStockValue) : "—"],
            ["Low-stock products (current)", stats ? String(stats.inventory?.lowStockProducts ?? 0) : "—"],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <p className="mt-2 break-words text-xl font-bold text-gray-900">
                {loadingStats && !stats ? "Loading..." : value}
              </p>
            </article>
          ))}
          <p className="text-xs leading-5 text-gray-500 sm:col-span-2 xl:col-span-3">
            Purchase and GST values use the selected period. Supplier payable is the current balance across received purchases. Input GST is recorded purchase data only; it is not a determination of credit eligibility or final tax liability.
          </p>
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-3">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Sales vs Purchases
            </h2>

            {stats ? (
              <SalesOverviewChart data={stats.salesTrend} />
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-gray-400">
                {loadingStats ? "Loading chart..." : "No data"}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Sales Payment Status
            </h2>

            {stats ? (
              <PaymentStatusChart data={stats.paymentStatus} />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                {loadingStats ? "Loading chart..." : "No data"}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h2 className="mb-1 text-lg font-semibold text-gray-900">
              Purchase Payment Status
            </h2>
            <p className="mb-4 text-xs text-gray-500">
              Received purchases in the selected period
            </p>
            {stats ? (
              <PaymentStatusChart
                data={stats.purchasePaymentStatus || []}
                label="Purchases"
              />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                {loadingStats ? "Loading chart..." : "No data"}
              </div>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm xl:col-span-3">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Top Suppliers</h2>
                <p className="mt-1 text-xs text-gray-500">
                  Purchase totals for selected period; outstanding is the overall current balance.
                </p>
              </div>
              <Link
                to="/purchase-history"
                className="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2.5">Supplier</th>
                    <th className="px-3 py-2.5">Purchases</th>
                    <th className="px-3 py-2.5">Paid</th>
                    <th className="px-3 py-2.5">Period Due</th>
                    <th className="px-3 py-2.5">Overall Due</th>
                    <th className="px-3 py-2.5">Last Purchase (overall)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {!stats?.topSuppliers?.length ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                        {loadingStats
                          ? "Loading suppliers..."
                          : "No received purchases in this period."}
                      </td>
                    </tr>
                  ) : (
                    stats.topSuppliers.map((supplier) => (
                      <tr key={supplier.key} className="hover:bg-gray-50">
                        <td className="px-3 py-3 font-medium text-gray-900">{supplier.name}</td>
                        <td className="whitespace-nowrap px-3 py-3">{formatCurrency(supplier.totalPurchases)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-green-700">{formatCurrency(supplier.amountPaid)}</td>
                        <td className="whitespace-nowrap px-3 py-3">{formatCurrency(supplier.periodOutstanding)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-amber-700">{formatCurrency(supplier.overallOutstanding)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-gray-600">{formatSaleDate(supplier.lastPurchaseDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent sales */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon d={ICONS.document} />
              </span>
              <h2 className="text-lg font-semibold text-gray-900">Recent Sales</h2>
            </div>

            <Link
              to="/sales-history"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>

          {recentError && (
            <p className="mx-5 mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {recentError}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Seller</th>
                  <th className="px-5 py-3">Buyer</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Total Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>

              <tbody
                className={`divide-y divide-gray-100 ${
                  loadingRecent && recentSales.length > 0 ? "opacity-60" : ""
                }`}
              >
                {recentSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-gray-500">
                      {loadingRecent ? "Loading recent sales..." : "No sales yet."}
                    </td>
                  </tr>
                ) : (
                  recentSales.map((sale) => (
                    <tr key={sale._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">
                        {formatSaleDate(sale.saleDate || sale.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {sale.sellerName || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        {sale.buyerName || "-"}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        {sale.productName || "-"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-gray-700">
                        {sale.quantity ?? "-"} {sale.unit || ""}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-gray-900">
                        {formatCurrency(sale.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusStyles[sale.paymentStatus] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {sale.paymentStatus || "-"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">
                        {sale.paymentMethod || "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedSale(sale)}
                          className="flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          <Icon d={ICONS.edit} className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <nav aria-label="Pagination" className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                aria-label="Previous page"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ‹
              </button>

              {pageNumbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-current={number === pagination.page ? "page" : undefined}
                  className={`min-w-[2.25rem] rounded-lg border px-3 py-1.5 text-sm font-medium ${
                    number === pagination.page
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {number}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                aria-label="Next page"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ›
              </button>
            </nav>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <label htmlFor="items-per-page">Items per page:</label>
              <select
                id="items-per-page"
                value={pagination.limit}
                onChange={(event) => changeLimit(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-blue-500"
              >
                {[5, 10, 20].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Icon d={ICONS.document} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Purchases</h2>
                <p className="text-xs text-gray-500">Received purchases in the selected period</p>
              </div>
            </div>
            <Link
              to="/purchase-history"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Invoice / Product</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Purchase Total</th>
                  <th className="px-5 py-3">GST</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Outstanding</th>
                  <th className="px-5 py-3">Payment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {!stats?.recentPurchases?.length ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-gray-500">
                      {loadingStats
                        ? "Loading recent purchases..."
                        : "No received purchases in this period."}
                    </td>
                  </tr>
                ) : (
                  stats.recentPurchases.map((purchase) => {
                    const snapshot = purchase.productSnapshot || {};
                    return (
                      <tr key={purchase._id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">
                          {formatSaleDate(purchase.purchaseDate)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900">
                          {purchase.supplierName || "Unnamed supplier"}
                        </td>
                        <td className="px-5 py-3.5 text-gray-700">
                          <span className="block">{purchase.invoiceNumber || "—"}</span>
                          <span className="text-xs text-gray-500">{snapshot.name || "—"}</span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-gray-700">
                          {snapshot.quantity ?? "—"} {snapshot.unit || ""}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 font-medium text-gray-900">
                          {formatCurrency(snapshot.invoiceTotal)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-gray-700">
                          {formatCurrency(snapshot.totalGst)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-green-700">
                          {formatCurrency(purchase.amountPaid)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-amber-700">
                          {formatCurrency(purchase.outstandingPayable)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              statusStyles[purchase.paymentStatus] ||
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {purchase.paymentStatus || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedSale && (
        <EditSaleDrawer
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onUpdated={async () => {
            refresh(); // cards, charts aur table sab dobara load honge
          }}
        />
      )}
    </main>
  );
};

export default Dashboard;