import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import SellerBuyerSection from "../component/salesInfo/SellerBuyerSection";
import ProductDetailsSection from "../component/salesInfo/ProductDetailsSection";
import PaymentDetailsSection from "../component/salesInfo/PaymentDetailsSection";

import useSales from "../hook/useSales";
import inventoryService from "../service/inventoryService";

const PENDING_SALE_KEY_STORAGE = "sales.pendingCreateIdempotencyKey";

function getLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const createInitialForm = () => ({
  sellerName: "",
  buyerName: "",
  buyerPhone: "",
  buyerGstin: "",
  buyerState: "",
  productId: "",
  productName: "",
  hsnCode: "",
  quantity: "1",
  unit: "Litre",
  pricePerUnit: "",
  discountAmount: "0",
  gstRate: "0",
  priceIncludesGst: false,
  saleDate: getLocalDate(),
  paymentMethod: "Cash",
  amountReceived: "0",
  notes: "",
});

function SalesInfo() {
  const navigate = useNavigate();
  const idempotencyKeyRef = useRef("");

  // Get sale creation operation and loading state from hook
  const { addSale, creatingSale, error, clearError } = useSales();

  const [formData, setFormData] = useState(createInitialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [inventoryError, setInventoryError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.all([
      inventoryService.getProducts(),
      inventoryService.getBusinessProfile(),
    ])
      .then(([productResponse, profileResponse]) => {
        if (!active) return;
        setProducts(productResponse.products || []);
        setBusinessProfile(profileResponse.profile || null);
        if (profileResponse.profile?.name) {
          setFormData((previous) => ({
            ...previous,
            sellerName: previous.sellerName || profileResponse.profile.name,
          }));
        }
      })
      .catch((requestError) => {
        if (!active) return;
        setInventoryError(
          requestError.response?.data?.message ||
            "Unable to load inventory and business settings."
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const gstPreview = useMemo(() => {
    const quantity = Number(formData.quantity) || 0;
    const price = Number(formData.pricePerUnit) || 0;
    const discount = Number(formData.discountAmount) || 0;
    const rate = Number(formData.gstRate) || 0;
    const gross = Math.round(quantity * price * 100) / 100;
    const afterDiscount = Math.max(0, gross - discount);
    const taxableAmount =
      rate > 0 && formData.priceIncludesGst
        ? Math.round((afterDiscount / (1 + rate / 100)) * 100) / 100
        : afterDiscount;
    const totalGst =
      rate > 0
        ? formData.priceIncludesGst
          ? Math.round((afterDiscount - taxableAmount) * 100) / 100
          : Math.round((taxableAmount * rate) / 100 * 100) / 100
        : 0;
    const sellerState = businessProfile?.state?.trim().toLowerCase();
    const buyerState = formData.buyerState.trim().toLowerCase();
    const sameState = sellerState && buyerState && sellerState === buyerState;
    const stateError =
      rate > 0 && (!sellerState || !buyerState)
        ? "Set the business state and customer state to calculate GST."
        : "";
    const cgstAmount =
      rate > 0 && sameState ? Math.round((totalGst / 2) * 100) / 100 : 0;
    const sgstAmount =
      rate > 0 && sameState
        ? Math.round((totalGst - cgstAmount) * 100) / 100
        : 0;
    const igstAmount = rate > 0 && sellerState && buyerState && !sameState
      ? totalGst
      : 0;

    return {
      taxableAmount,
      totalGst,
      cgstAmount,
      sgstAmount,
      igstAmount,
      gstRate: rate,
      stateError,
      invoiceTotal: Math.round((taxableAmount + totalGst) * 100) / 100,
    };
  }, [
    formData.quantity,
    formData.pricePerUnit,
    formData.discountAmount,
    formData.gstRate,
    formData.priceIncludesGst,
    formData.buyerState,
    businessProfile?.state,
  ]);
  const totalAmount = gstPreview.invoiceTotal;

  // Calculate payment details
  const amountReceived = Number(formData.amountReceived) || 0;

  const remainingBalance =
    Math.round((totalAmount - amountReceived) * 100) / 100;

  const paymentStatus =
    amountReceived === 0
      ? "Pending"
      : remainingBalance <= 0
        ? "Paid"
        : "Partial";

  // Handle form input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage("");
    setSuccessMessage("");

    // Clear previous API error when user edits the form
    if (error) {
      clearError();
    }
  };

  const handleProductSelect = (event) => {
    const productId = event.target.value;
    const product = products.find((item) => item._id === productId);

    setFormData((previous) => ({
      ...previous,
      productId,
      productName: product?.name || "",
      hsnCode: product?.hsnCode || "",
      unit: product?.unit || "Litre",
      pricePerUnit: product ? String(product.sellingPrice) : "",
      gstRate: product ? String(product.gstRate) : "0",
    }));
    setErrorMessage("");
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const quantity = Number(formData.quantity);
    const pricePerUnit = Number(formData.pricePerUnit);
    const received = Number(formData.amountReceived);

    // Required fields validation
    if (
      !formData.sellerName.trim() ||
      !formData.buyerName.trim() ||
      !formData.productName.trim()
    ) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (Number(formData.discountAmount) > quantity * pricePerUnit) {
      setErrorMessage("Discount cannot exceed the line amount.");
      return;
    }

    if (gstPreview.stateError) {
      setErrorMessage(gstPreview.stateError);
      return;
    }

    // Quantity validation
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage("Quantity must be greater than zero.");
      return;
    }

    // Price validation
    if (
      formData.pricePerUnit.trim() === "" ||
      !Number.isFinite(pricePerUnit) ||
      pricePerUnit < 0
    ) {
      setErrorMessage("Enter a valid selling price.");
      return;
    }

    // Received amount validation
    if (
      formData.amountReceived.trim() === "" ||
      !Number.isFinite(received) ||
      received < 0 ||
      received > totalAmount
    ) {
      setErrorMessage(
        "Amount received cannot be negative or exceed the total amount."
      );
      return;
    }

    // Sale date validation
    if (!formData.saleDate) {
      setErrorMessage("Please select a sale date.");
      return;
    }

    // Prepare payload for backend
    if (!idempotencyKeyRef.current) {
      try {
        const storedKey = window.sessionStorage.getItem(PENDING_SALE_KEY_STORAGE);
        if (storedKey) {
          idempotencyKeyRef.current = storedKey;
        } else if (globalThis.crypto?.randomUUID) {
          idempotencyKeyRef.current = globalThis.crypto.randomUUID();
        } else if (globalThis.crypto?.getRandomValues) {
          const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
          idempotencyKeyRef.current = Array.from(bytes, (byte) =>
            byte.toString(16).padStart(2, "0")
          ).join("");
        } else {
          throw new Error(
            "Secure sale retry protection is unavailable in this browser."
          );
        }
        window.sessionStorage.setItem(
          PENDING_SALE_KEY_STORAGE,
          idempotencyKeyRef.current
        );
      } catch (keyError) {
        setErrorMessage(keyError.message);
        return;
      }
    }

    const saleData = {
      idempotencyKey: idempotencyKeyRef.current,
      sellerName: formData.sellerName.trim(),
      buyerName: formData.buyerName.trim(),
      buyerPhone: formData.buyerPhone.trim(),
      buyerGstin: formData.buyerGstin.trim(),
      buyerState: formData.buyerState.trim(),
      productId: formData.productId || undefined,
      productName: formData.productName.trim(),
      hsnCode: formData.hsnCode.trim(),
      quantity,
      unit: formData.unit,
      pricePerUnit,
      discountAmount: Number(formData.discountAmount) || 0,
      gstRate: Number(formData.gstRate),
      priceIncludesGst: formData.priceIncludesGst,
      totalAmount,
      amountReceived: received,
      remainingBalance,
      paymentStatus,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes.trim(),

      // Preserve the selected calendar date
      saleDate: `${formData.saleDate}T12:00:00.000Z`,
    };

    try {
      // Use hook instead of calling salesService directly
      const response = await addSale(saleData);

      if (response?.success === false) {
        throw new Error(response.message || "Failed to save sale.");
      }

      window.sessionStorage.removeItem(PENDING_SALE_KEY_STORAGE);
      setSuccessMessage("Sale record saved successfully!");
      setFormData(createInitialForm);
      idempotencyKeyRef.current = "";
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to save sale. Please try again."
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
        {/* Page Header */}
        <header className="mb-2 flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl text-emerald-700">
            ▤
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sales Info
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Record and manage your sales transactions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/sales-history")}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sales History
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          {inventoryError && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            >
              {inventoryError} You can still record a manual sale without inventory tracking.
            </p>
          )}

          <SellerBuyerSection
            formData={formData}
            onChange={handleChange}
          />

          <ProductDetailsSection
            formData={formData}
            onChange={handleChange}
            totalAmount={totalAmount}
            products={products}
            gstPreview={gstPreview}
            onProductSelect={handleProductSelect}
          />

          <PaymentDetailsSection
            formData={formData}
            onChange={handleChange}
            totalAmount={totalAmount}
            remainingBalance={remainingBalance}
            paymentStatus={paymentStatus}
          />

          {/* Validation or submission error */}
          {(errorMessage || error) && (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage || error}
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={creatingSale}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 focus:outline-none focus:ring-4 focus:ring-neutral-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingSale ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Saving Sale...
              </>
            ) : (
              "▣ Save Sale Record →"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

export default SalesInfo;