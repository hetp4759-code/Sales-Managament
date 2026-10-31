import React from "react";

const paymentMethods = [
  "Cash",
  "UPI",
  "Bank Transfer",
  "Other",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const labelClass =
  "mb-2 block text-sm font-medium text-slate-600";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

function PaymentDetailsSection({
  formData,
  onChange,
  totalAmount,
  remainingBalance,
  paymentStatus,
}) {
  const statusStyles = {
    Paid: "bg-emerald-100 text-emerald-700",
    Partial: "bg-amber-100 text-amber-700",
    Pending: "bg-red-100 text-red-700",
  };

  return (
    <section className="py-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
          ▤
        </div>

        <div>
          <h2 className="font-semibold text-slate-800">
            3. Sale & Payment Details
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter the sale date and payment information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="saleDate">
            Sale Date <span className="text-red-500">*</span>
          </label>

          <input
            id="saleDate"
            name="saleDate"
            type="date"
            value={formData.saleDate}
            onChange={onChange}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Payment Status</label>

          <div className="flex min-h-[46px] items-center gap-3">
            <span
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                statusStyles[paymentStatus]
              }`}
            >
              {paymentStatus}
            </span>

            <span className="text-xs text-slate-500">
              {paymentStatus === "Paid" && "Full payment received"}
              {paymentStatus === "Partial" && "Payment partly received"}
              {paymentStatus === "Pending" && "Payment not received"}
            </span>
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="paymentMethod">
            Payment Method <span className="text-red-500">*</span>
          </label>

          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={onChange}
            className={inputClass}
            required
          >
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="amountReceived">
            Amount Received (₹) <span className="text-red-500">*</span>
          </label>

          <input
            id="amountReceived"
            name="amountReceived"
            type="number"
            min="0"
            max={totalAmount}
            step="any"
            value={formData.amountReceived}
            onChange={onChange}
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">
              Total Amount
            </p>

            <p className="mt-2 text-xl font-bold text-slate-800">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <p className="text-xs font-medium text-slate-500">
              Remaining Balance
            </p>

            <p
              className={`mt-2 text-xl font-bold ${
                remainingBalance > 0
                  ? "text-red-600"
                  : "text-emerald-700"
              }`}
            >
              {formatCurrency(remainingBalance)}
            </p>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Notes (Optional)
          </label>

          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            placeholder="Additional sale details..."
            value={formData.notes}
            onChange={onChange}
            className={`${inputClass} resize-y`}
          />

          <p className="mt-1 text-right text-xs text-slate-400">
            {formData.notes.length}/500
          </p>
        </div>
      </div>
    </section>
  );
}

export default PaymentDetailsSection;