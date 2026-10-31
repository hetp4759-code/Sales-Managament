import React from "react";

const units = ["Kg", "Litre", "Gram", "Packet", "Piece"];

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

function ProductDetailsSection({
  formData,
  onChange,
  totalAmount,
  products = [],
  gstPreview,
  onProductSelect,
}) {
  return (
    <section className="border-b border-slate-100 py-7">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
          ◈
        </div>

        <div>
          <h2 className="font-semibold text-slate-800">
            2. Product Details
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Enter product quantity and selling price.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {products.length > 0 && (
          <div className="md:col-span-2">
            <label className={labelClass} htmlFor="productId">
              Inventory Product (optional)
            </label>
            <select
              id="productId"
              name="productId"
              value={formData.productId}
              onChange={onProductSelect}
              className={inputClass}
            >
              <option value="">Manual / untracked sale</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}{product.sku ? ` (${product.sku})` : ""} · Stock: {product.stock} {product.unit}
                </option>
              ))}
            </select>
            {formData.productId && (
              <p className="mt-1 text-xs text-slate-500">
                Stock will be checked and reduced by the backend when the sale is saved.
              </p>
            )}
          </div>
        )}

        <div className="md:col-span-2">
          <label className={labelClass} htmlFor="productName">
            Product Name <span className="text-red-500">*</span>
          </label>

          <input
            id="productName"
            name="productName"
            type="text"
            placeholder="Enter product name"
            value={formData.productName}
            onChange={onChange}
            className={inputClass}
            readOnly={Boolean(formData.productId)}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="quantity">
            Quantity <span className="text-red-500">*</span>
          </label>

          <input
            id="quantity"
            name="quantity"
            type="number"
            min="0.01"
            step="any"
            placeholder="Enter quantity"
            value={formData.quantity}
            onChange={onChange}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="unit">
            Unit <span className="text-red-500">*</span>
          </label>

          <select
            id="unit"
            name="unit"
            value={formData.unit}
            onChange={onChange}
            className={inputClass}
            required
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="pricePerUnit">
            Selling Price per Unit (₹){" "}
            <span className="text-red-500">*</span>
          </label>

          <input
            id="pricePerUnit"
            name="pricePerUnit"
            type="number"
            min="0"
            step="any"
            placeholder="Enter price per unit"
            value={formData.pricePerUnit}
            onChange={onChange}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="hsnCode">
            HSN Code
          </label>
          <input
            id="hsnCode"
            name="hsnCode"
            value={formData.hsnCode}
            onChange={onChange}
            className={inputClass}
            placeholder="Optional"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="gstRate">
            GST Rate
          </label>
          <select
            id="gstRate"
            name="gstRate"
            value={formData.gstRate}
            onChange={onChange}
            className={inputClass}
          >
            {[0, 5, 12, 18, 28].map((rate) => (
              <option key={rate} value={rate}>{rate}%</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="discountAmount">
            Discount (₹)
          </label>
          <input
            id="discountAmount"
            name="discountAmount"
            type="number"
            min="0"
            step="0.01"
            value={formData.discountAmount}
            onChange={onChange}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="priceIncludesGst">
            Price Mode
          </label>
          <select
            id="priceIncludesGst"
            name="priceIncludesGst"
            value={formData.priceIncludesGst ? "inclusive" : "exclusive"}
            onChange={(event) =>
              onChange({
                target: {
                  name: "priceIncludesGst",
                  value: event.target.value === "inclusive",
                },
              })
            }
            className={inputClass}
          >
            <option value="exclusive">Price excludes GST</option>
            <option value="inclusive">Price includes GST</option>
          </select>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-green-50 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-emerald-800">Taxable Amount</p>
            <p className="mt-1 text-lg font-bold text-emerald-900">
              {formatCurrency(gstPreview?.taxableAmount ?? totalAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Invoice Total</p>
            <p className="mt-1 text-lg font-bold text-emerald-900">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-emerald-800">
            <span>GST {gstPreview?.gstRate ?? 0}% · {formatCurrency(gstPreview?.totalGst ?? 0)}</span>
            <span>CGST {formatCurrency(gstPreview?.cgstAmount ?? 0)}</span>
            <span>SGST {formatCurrency(gstPreview?.sgstAmount ?? 0)}</span>
            <span>IGST {formatCurrency(gstPreview?.igstAmount ?? 0)}</span>
            {gstPreview?.stateError && (
              <span className="font-medium text-amber-700">{gstPreview.stateError}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductDetailsSection;