import { useEffect, useState } from "react";
import useSalesUpdate from "../../hook/useSalesUpdate";

const initialForm = {
    sellerName: "",
    sellerAddress: "",
    sellerGstin: "",
    sellerState: "",
    buyerName: "",
    buyerPhone: "",
    buyerGstin: "",
    buyerState: "",
    saleDate: "",
    productName: "",
    hsnCode: "",
    quantity: "",
    unit: "Litre",
    pricePerUnit: "",
    discountAmount: "0",
    gstRate: "",
    priceIncludesGst: false,
    totalAmount: "",
    amountReceived: "",
    paymentStatus: "Pending",
    paymentMethod: "Cash",
    notes: "",
};

const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelClass =
    "mb-1.5 block text-sm font-medium text-gray-700";

const roundMoney = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const EditSaleDrawer = ({
    sale,
    onClose,
    onUpdated,
}) => {
    const [formData, setFormData] = useState(initialForm);
    const [formError, setFormError] = useState("");
    const [gstEnabled, setGstEnabled] = useState(false);

    const {
        updateSale,
        updatingSale,
        error,
        clearError,
    } = useSalesUpdate();

    useEffect(() => {
        if (!sale) return;

        setFormData({
            sellerName: sale.sellerName ?? "",
            sellerAddress: sale.sellerAddress ?? "",
            sellerGstin: sale.sellerGstin ?? "",
            sellerState: sale.sellerState ?? "",
            buyerName: sale.buyerName ?? "",
            buyerPhone: sale.buyerPhone ?? "",
            buyerGstin: sale.buyerGstin ?? "",
            buyerState: sale.buyerState ?? "",
            saleDate: sale.saleDate
                ? new Date(sale.saleDate).toISOString().slice(0, 10)
                : "",
            productName: sale.productName ?? "",
            hsnCode: sale.hsnCode ?? "",
            quantity: sale.quantity ?? "",
            unit: sale.unit ?? "Litre",
            pricePerUnit: sale.pricePerUnit ?? "",
            discountAmount: sale.discountAmount ?? 0,
            gstRate: sale.gstRate ?? "",
            priceIncludesGst: sale.priceIncludesGst ?? false,
            totalAmount: sale.totalAmount ?? "",
            amountReceived: sale.amountReceived ?? "",
            paymentStatus: sale.paymentStatus ?? "Pending",
            paymentMethod: sale.paymentMethod ?? "Cash",
            notes: sale.notes ?? "",
        });
        setGstEnabled(sale.gstRate != null);

        setFormError("");
        clearError();
    }, [sale, clearError]);

    if (!sale) return null;

    const quantity = Number(formData.quantity);
    const pricePerUnit = Number(formData.pricePerUnit);
    const discountAmount =
        formData.discountAmount === "" ? 0 : Number(formData.discountAmount);
    const rate =
        gstEnabled && formData.gstRate !== "" ? Number(formData.gstRate) : 0;
    const grossAmount = roundMoney(
        (Number.isFinite(quantity) ? quantity : 0) *
            (Number.isFinite(pricePerUnit) ? pricePerUnit : 0)
    );
    const amountAfterDiscount = grossAmount - discountAmount;
    const taxableAmount =
        rate > 0 && formData.priceIncludesGst
            ? roundMoney(amountAfterDiscount / (1 + rate / 100))
            : roundMoney(amountAfterDiscount);
    const gstAmount =
        rate > 0
            ? formData.priceIncludesGst
                ? roundMoney(amountAfterDiscount - taxableAmount)
                : roundMoney((taxableAmount * rate) / 100)
            : 0;
    const computedTotal =
        gstEnabled
            ? roundMoney(taxableAmount + gstAmount)
            : roundMoney(quantity * pricePerUnit - discountAmount);
    const remainingBalance =
        computedTotal -
        (Number(formData.amountReceived) || 0);

    const receivedAmount = Number(formData.amountReceived) || 0;

    const paymentStatusPreview =
        receivedAmount === 0
            ? "Pending"
            : remainingBalance <= 0
                ? "Paid"
                : "Partial";

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };


    const handleSubmit = async (event) => {
        event.preventDefault();

        setFormError("");
        clearError();

        const totalAmount = computedTotal;
        const amountReceived = Number(formData.amountReceived);

        // Validate quantity
        if (
            formData.quantity === "" ||
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            setFormError("Quantity must be greater than zero.");
            return;
        }

        if (
            formData.pricePerUnit === "" ||
            !Number.isFinite(pricePerUnit) ||
            pricePerUnit < 0
        ) {
            setFormError("Please enter a valid price per unit.");
            return;
        }

        if (!Number.isFinite(discountAmount) || discountAmount < 0) {
            setFormError("Enter a valid discount amount.");
            return;
        }

        if (discountAmount > grossAmount) {
            setFormError("Discount cannot exceed the line amount.");
            return;
        }

        if (
            gstEnabled &&
            formData.gstRate === ""
        ) {
            setFormError("Select a GST rate before saving.");
            return;
        }

        if (
            gstEnabled &&
            rate > 0 &&
            (!formData.sellerState.trim() || !formData.buyerState.trim())
        ) {
            setFormError("Enter both seller and buyer states to calculate GST.");
            return;
        }

        // Validate payment amounts
        if (
            formData.amountReceived === "" ||
            !Number.isFinite(totalAmount) ||
            !Number.isFinite(amountReceived) ||
            totalAmount < 0 ||
            amountReceived < 0 ||
            amountReceived > totalAmount
        ) {
            setFormError("Please check the total amount and amount received.");
            return;
        }

        // Calculate payment status
        const paymentStatus =
            amountReceived === 0
                ? "Pending"
                : amountReceived >= totalAmount
                    ? "Paid"
                    : "Partial";

        // Prepare update payload
        const payload = {
            ...formData,
            quantity,
            pricePerUnit,
            totalAmount,
            amountReceived,
            remainingBalance: totalAmount - amountReceived,
            paymentStatus,
            gstRate: gstEnabled ? rate : null,
            priceIncludesGst: gstEnabled ? formData.priceIncludesGst : false,
        };

        try {
            const updatedSale = await updateSale(sale._id, payload);

            // Notify parent component
            if (onUpdated) {
                await onUpdated(updatedSale);
            }

            // Close drawer after successful update
            onClose?.();
        } catch {
            // Context error is displayed in the drawer.
            // Keep drawer open if update fails.
        }
    };

    return (
        <div
            className="fixed inset-0 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-sale-title"
        >
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close edit form"
                onClick={onClose}
                className="absolute inset-0 h-full w-full cursor-default bg-gray-900/40"
            />

            {/* Right-side drawer */}
            <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
                    <div>
                        <h2
                            id="edit-sale-title"
                            className="text-xl font-bold text-gray-900"
                        >
                            Edit Sale
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Update the existing sale information.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                        {(formError || error) && (
                            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {formError || error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelClass}>
                                    Seller Name
                                </label>
                                <input
                                    name="sellerName"
                                    value={formData.sellerName}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Seller State
                                </label>
                                <input
                                    name="sellerState"
                                    value={formData.sellerState}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Seller GSTIN
                                </label>
                                <input
                                    name="sellerGstin"
                                    value={formData.sellerGstin}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className={labelClass}>
                                    Seller Address
                                </label>
                                <input
                                    name="sellerAddress"
                                    value={formData.sellerAddress}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Buyer Name
                                </label>
                                <input
                                    name="buyerName"
                                    value={formData.buyerName}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Buyer Phone
                                </label>
                                <input
                                    type="tel"
                                    name="buyerPhone"
                                    value={formData.buyerPhone}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Buyer State
                                </label>
                                <input
                                    name="buyerState"
                                    value={formData.buyerState}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Buyer GSTIN
                                </label>
                                <input
                                    name="buyerGstin"
                                    value={formData.buyerGstin}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Sale Date
                                </label>
                                <input
                                    type="date"
                                    name="saleDate"
                                    value={formData.saleDate}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    HSN/SAC Code
                                </label>
                                <input
                                    name="hsnCode"
                                    value={formData.hsnCode}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Product Name
                                </label>
                                <input
                                    name="productName"
                                    value={formData.productName}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Unit
                                </label>
                                <input
                                    name="unit"
                                    value={formData.unit}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Price Per Unit
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    name="pricePerUnit"
                                    value={formData.pricePerUnit}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Discount (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="discountAmount"
                                    value={formData.discountAmount}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Total Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                        Number.isFinite(computedTotal)
                                            ? computedTotal.toFixed(2)
                                            : ""
                                    }
                                    readOnly
                                    className={`${inputClass} bg-gray-100`}
                                />
                            </div>

                            <div className="sm:col-span-2 rounded-lg border border-gray-200 p-4">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={gstEnabled}
                                        onChange={(event) =>
                                            setGstEnabled(event.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Apply GST to this sale
                                </label>

                                {gstEnabled && (
                                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className={labelClass}>
                                                GST Rate
                                            </label>
                                            <select
                                                name="gstRate"
                                                value={formData.gstRate}
                                                onChange={handleChange}
                                                className={inputClass}
                                            >
                                                <option value="">Select rate</option>
                                                <option value="0">0%</option>
                                                <option value="5">5%</option>
                                                <option value="12">12%</option>
                                                <option value="18">18%</option>
                                                <option value="28">28%</option>
                                            </select>
                                        </div>
                                        <label className="flex items-center gap-2 self-end pb-2 text-sm text-gray-700">
                                            <input
                                                type="checkbox"
                                                name="priceIncludesGst"
                                                checked={Boolean(formData.priceIncludesGst)}
                                                onChange={(event) =>
                                                    setFormData((previous) => ({
                                                        ...previous,
                                                        priceIncludesGst: event.target.checked,
                                                    }))
                                                }
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            Price includes GST
                                        </label>
                                        <div className="sm:col-span-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                            Taxable amount: ₹{taxableAmount.toFixed(2)}
                                            {" · "}GST: ₹{gstAmount.toFixed(2)}
                                            {" · "}Total: ₹{computedTotal.toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Amount Received (₹)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="amountReceived"
                                    value={formData.amountReceived}
                                    onChange={handleChange}
                                    className={inputClass}
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className={labelClass}>
                                    Remaining Balance
                                </label>

                                <div
                                    className={`rounded-lg border px-3 py-3 text-sm font-semibold ${remainingBalance === 0
                                        ? "border-green-200 bg-green-50 text-green-700"
                                        : "border-amber-200 bg-amber-50 text-amber-700"
                                        }`}
                                >
                                    ₹
                                    {remainingBalance.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Payment Status
                                </label>

                                <input
                                    value={paymentStatusPreview}
                                    readOnly
                                    className={`${inputClass} bg-gray-100`}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Payment Method
                                </label>

                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">
                                        Bank Transfer
                                    </option>
                                    <option value="Card">Card</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <label className={labelClass}>
                                    Notes
                                </label>

                                <textarea
                                    name="notes"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Enter payment notes..."
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={updatingSale}
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={updatingSale}
                            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {updatingSale ? "Updating..." : "Update Sale"}
                        </button>
                    </div>
                </form>
            </aside>
        </div>
    );
};

export default EditSaleDrawer;