import React from "react";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const labelClass =
  "mb-2 block text-sm font-medium text-slate-600";

function SellerBuyerSection({ formData, onChange }) {
  return (
    <section className="border-b border-slate-100 py-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
          ♙
        </div>

        <div>
          <h2 className="font-semibold text-slate-800">
            1. Seller & Buyer Details
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter the seller and customer information.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="sellerName">
            Seller / Business Name <span className="text-red-500">*</span>
          </label>

          <input
            id="sellerName"
            name="sellerName"
            type="text"
            placeholder="e.g. ABC Dairy"
            value={formData.sellerName}
            onChange={onChange}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="buyerName">
            Buyer / Customer Name <span className="text-red-500">*</span>
          </label>

          <input
            id="buyerName"
            name="buyerName"
            type="text"
            placeholder="e.g. Rahul Dairy Store"
            value={formData.buyerName}
            onChange={onChange}
            className={inputClass}
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="buyerPhone">
            Buyer / Customer Phone
          </label>

          <input
            id="buyerPhone"
            name="buyerPhone"
            type="tel"
            placeholder="Enter customer phone number"
            value={formData.buyerPhone}
            onChange={onChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="buyerState">
            Customer State
          </label>
          <input
            id="buyerState"
            name="buyerState"
            type="text"
            placeholder="Required when GST applies"
            value={formData.buyerState}
            onChange={onChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="buyerGstin">
            Customer GSTIN
          </label>
          <input
            id="buyerGstin"
            name="buyerGstin"
            type="text"
            autoCapitalize="characters"
            placeholder="Optional"
            value={formData.buyerGstin}
            onChange={onChange}
            className={inputClass}
          />
        </div>
      </div>
    </section>
  );
}

export default SellerBuyerSection;