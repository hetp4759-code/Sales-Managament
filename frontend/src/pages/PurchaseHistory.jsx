import { Fragment, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import inventoryService from "../service/inventoryService";
import purchaseService from "../service/purchaseService";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const labelClass = "block text-sm font-medium text-slate-700";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
};

const dateInputValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const createPaymentRequestKey = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure payment retries are unavailable in this browser.");
  }
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getEditForm = (purchase) => ({
  supplierName: purchase.supplierName || "",
  supplierState: purchase.supplierState || "",
  supplierGstin: purchase.supplierGstin || "",
  invoiceNumber: purchase.invoiceNumber || "",
  purchaseDate: dateInputValue(purchase.purchaseDate),
  productId: purchase.productId || "",
  quantity: String(purchase.productSnapshot?.quantity ?? ""),
  pricePerUnit: String(purchase.productSnapshot?.pricePerUnit ?? ""),
  discountAmount: String(purchase.productSnapshot?.discountAmount ?? 0),
  gstRate: String(purchase.productSnapshot?.gstRate ?? 0),
  priceIncludesGst: String(purchase.productSnapshot?.priceIncludesGst === true),
  notes: purchase.notes || "",
});

const getPaymentHistory = (purchase) => {
  const payments = Array.isArray(purchase?.payments)
    ? purchase.payments.map((payment) => ({ ...payment }))
    : [];
  const recordedCents = payments.reduce(
    (total, payment) => total + Math.round((Number(payment.amount) || 0) * 100),
    0
  );
  const paidCents = Math.round((Number(purchase?.amountPaid) || 0) * 100);
  const legacyCents = paidCents - recordedCents;

  if (legacyCents > 0) {
    payments.push({
      _id: "legacy-payment",
      amount: legacyCents / 100,
      paymentMethod: purchase.paymentMethod || "Other",
      paymentDate: purchase.createdAt || purchase.purchaseDate,
      reference: "Previously recorded payment (legacy aggregate)",
      legacy: true,
    });
  }

  return payments.sort(
    (first, second) =>
      new Date(first.paymentDate || 0) - new Date(second.paymentDate || 0)
  );
};

const getPaymentSummary = (purchase) => {
  const rawTotal = purchase?.productSnapshot?.invoiceTotal;
  const rawPaid = purchase?.amountPaid;
  const rawOutstanding = purchase?.outstandingPayable;

  const toCents = (value) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0
    ) {
      return null;
    }

    const cents = Math.round(
      (Number(value) + Number.EPSILON) * 100
    );

    return Number.isSafeInteger(cents) ? cents : null;
  };

  const totalCents = toCents(rawTotal);
  const paidCents = toCents(rawPaid);
  const storedOutstandingCents = toCents(rawOutstanding);

  const hasAmounts = totalCents !== null && paidCents !== null;

  const balanceCents = hasAmounts
    ? totalCents - paidCents
    : null;

  const hasExcessPayment = hasAmounts && balanceCents < 0;

  const balanceMismatch =
    hasAmounts &&
    storedOutstandingCents !== null &&
    storedOutstandingCents !== balanceCents;

  let status = "Unavailable";

  if (hasAmounts) {
    if (hasExcessPayment) {
      status = "Needs review";
    } else if (balanceCents === 0) {
      status = "Paid";
    } else if (paidCents === 0) {
      status = "Pending";
    } else {
      status = "Partial";
    }
  }

  return {
    total: totalCents === null ? null : totalCents / 100,
    paid: paidCents === null ? null : paidCents / 100,
    outstanding:
      balanceCents === null || balanceCents < 0
        ? null
        : balanceCents / 100,
    excess:
      hasExcessPayment ? Math.abs(balanceCents) / 100 : 0,
    status,
    hasAmounts,
    hasExcessPayment,
    balanceMismatch,
  };
};

const paymentStatusClass = {
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Partial: "border-amber-200 bg-amber-50 text-amber-800",
  Pending: "border-slate-200 bg-slate-100 text-slate-700",
  "Needs review": "border-red-200 bg-red-50 text-red-700",
  Unavailable: "border-slate-200 bg-slate-100 text-slate-500",
};
const paymentMethods = ["Cash", "UPI", "Bank Transfer", "Card", "Other"];

const PurchaseHistory = () => {
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState({
    search: "",
    startDate: "",
    endDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [expandedId, setExpandedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");
  const [success, setSuccess] = useState("");
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editInitial, setEditInitial] = useState(null);
  const [editProducts, setEditProducts] = useState([]);
  const [loadingEditProducts, setLoadingEditProducts] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMethod: "Cash",
    paymentDate: localDate(),
    reference: "",
  });
  const [paymentRequestKey, setPaymentRequestKey] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentOutcomeUncertain, setPaymentOutcomeUncertain] = useState(false);
  const [refreshingPayment, setRefreshingPayment] = useState(false);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await purchaseService.getPurchases({
        ...appliedFilters,
        page: pagination.page,
        limit: pagination.limit,
      });
      setPurchases(response.purchases || []);
      setSummary(response.summary || null);
      setPagination((previous) => ({
        ...previous,
        ...(response.pagination || {}),
      }));
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        "Unable to load purchase history."
      );
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, pagination.page, pagination.limit]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  const handleApply = (event) => {
    event.preventDefault();
    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      setError("Start date cannot be after end date.");
      return;
    }
    setPagination((previous) => ({ ...previous, page: 1 }));
    setAppliedFilters(filters);
  };

  const handleReceive = async (purchase) => {
    setActionId(purchase._id);
    setError("");
    try {
      await purchaseService.receivePurchase(purchase._id);
      await loadPurchases();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        "Unable to receive this purchase."
      );
    } finally {
      setActionId("");
    }
  };

  const handleEdit = async (purchase) => {
    const form = getEditForm(purchase);
    setEditingPurchase(purchase);
    setEditForm(form);
    setEditInitial(form);
    setEditError("");
    setSuccess("");
    setShowPaymentForm(false);
    setPaymentError("");
    setPaymentSuccess("");
    setPaymentOutcomeUncertain(false);
    setEditProducts([]);
    setLoadingEditProducts(true);

    try {
      const response = await inventoryService.getProducts({
        includeInactive: true,
      });
      setEditProducts(response.products || []);
    } catch (requestError) {
      setEditError(
        requestError.response?.data?.message ||
        "Unable to load products for editing."
      );
    } finally {
      setLoadingEditProducts(false);
    }
  };

  const closeEdit = () => {
    if (savingEdit || recordingPayment) return;
    setEditingPurchase(null);
    setEditForm(null);
    setEditInitial(null);
    setEditError("");
    setShowPaymentForm(false);
    setPaymentError("");
    setPaymentSuccess("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    setEditError("");

    if (!editForm.supplierName.trim() || !editForm.supplierState.trim()) {
      setEditError("Supplier name and state are required.");
      return;
    }
    if (!editForm.purchaseDate || !editForm.productId) {
      setEditError("Purchase date and product are required.");
      return;
    }

    const quantity = Number(editForm.quantity);
    const pricePerUnit = Number(editForm.pricePerUnit);
    const discountAmount = Number(editForm.discountAmount);
    const gstRate = Number(editForm.gstRate);
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(pricePerUnit) ||
      pricePerUnit < 0 ||
      !Number.isFinite(discountAmount) ||
      discountAmount < 0 ||
      discountAmount >
      Math.round((quantity * pricePerUnit + Number.EPSILON) * 100) / 100 ||
      ![0, 5, 12, 18, 28].includes(gstRate)
    ) {
      setEditError("Enter a valid quantity, price, discount, and GST rate.");
      return;
    }

    const changedFields = Object.keys(editForm).filter(
      (field) => editForm[field] !== editInitial[field]
    );
    if (changedFields.length === 0) {
      setEditError("Make at least one change before saving.");
      return;
    }

    const updates = {};
    for (const field of changedFields) {
      const value = editForm[field];
      if (["quantity", "pricePerUnit", "discountAmount", "gstRate"].includes(field)) {
        updates[field] = Number(value);
      } else if (field === "priceIncludesGst") {
        updates[field] = value === "true";
      } else if (field === "purchaseDate") {
        updates[field] = `${value}T12:00:00.000Z`;
      } else {
        updates[field] = value;
      }
    }

    setSavingEdit(true);
    setSuccess("");
    try {
      await purchaseService.updatePurchase(editingPurchase._id, updates);
      setEditingPurchase(null);
      setEditForm(null);
      setEditInitial(null);
      setSuccess("Purchase updated successfully.");
      await loadPurchases();
    } catch (requestError) {
      setEditError(
        requestError.response?.data?.message ||
        "Unable to update this purchase."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const beginPayment = async () => {
    if (hasUnsavedPricingChanges) return;
    setPaymentError("");
    setPaymentSuccess("");
    setRefreshingPayment(true);
    try {
      const response = await purchaseService.getPurchase(editingPurchase._id);
      const freshPurchase = response.purchase;
      setEditingPurchase(freshPurchase);
      setPurchases((current) =>
        current.map((purchase) =>
          purchase._id === freshPurchase._id ? freshPurchase : purchase
        )
      );
      const freshSummary = getPaymentSummary(freshPurchase);
      if (!freshSummary.hasAmounts || freshSummary.outstanding <= 0) {
        setPaymentError("There is no confirmed outstanding balance to pay.");
        return;
      }

      setPaymentForm({
        amount: "",
        paymentMethod: "Cash",
        paymentDate: localDate(),
        reference: "",
      });
      setPaymentRequestKey(createPaymentRequestKey());
      setPaymentOutcomeUncertain(false);
      setShowPaymentForm(true);
    } catch (requestError) {
      setPaymentError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to refresh purchase payment details."
      );
    } finally {
      setRefreshingPayment(false);
    }
  };

  const handlePaymentFieldChange = (field, value) => {
    setPaymentForm((previous) => ({ ...previous, [field]: value }));
    setPaymentError("");
    if (paymentOutcomeUncertain) return;
    try {
      setPaymentRequestKey(createPaymentRequestKey());
    } catch (requestError) {
      setPaymentError(requestError.message);
    }
  };

  const handleRecordPayment = async () => {
    setPaymentError("");
    setPaymentSuccess("");
    if (hasUnsavedPricingChanges) {
      setPaymentError("Save or cancel the unsaved pricing changes before recording a payment.");
      return;
    }

    const amountText = paymentForm.amount.trim();
    const amount = Number(amountText);
    if (
      !/^\d+(?:\.\d{1,2})?$/.test(amountText) ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setPaymentError("Enter a payment amount greater than zero with at most two decimal places.");
      return;
    }
    if (!paymentSummary?.hasAmounts || paymentSummary.outstanding === null) {
      setPaymentError("The saved outstanding balance is unavailable.");
      return;
    }
    if (amount > paymentSummary.outstanding) {
      setPaymentError(
        `Payment cannot exceed the outstanding balance of ${money(paymentSummary.outstanding)}.`
      );
      return;
    }
    if (!paymentMethods.includes(paymentForm.paymentMethod)) {
      setPaymentError("Select a valid payment method.");
      return;
    }
    if (!paymentForm.paymentDate) {
      setPaymentError("Select a payment date.");
      return;
    }
    if (paymentForm.reference.trim().length > 200) {
      setPaymentError("Payment reference must be 200 characters or fewer.");
      return;
    }
    if (!paymentRequestKey) {
      setPaymentError("Could not create a secure payment request key. Reopen the payment form.");
      return;
    }

    setRecordingPayment(true);
    try {
      const response = await purchaseService.updatePayment(editingPurchase._id, {
        amount,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: `${paymentForm.paymentDate}T12:00:00.000Z`,
        reference: paymentForm.reference.trim(),
        idempotencyKey: paymentRequestKey,
      });
      if (!response.purchase) {
        setPaymentOutcomeUncertain(true);
        setPaymentError("The server response did not include updated payment details. Retry safely without changing this payment.");
        return;
      }

      setEditingPurchase(response.purchase);
      setPurchases((current) =>
        current.map((purchase) =>
          purchase._id === response.purchase._id ? response.purchase : purchase
        )
      );
      setPaymentSuccess(response.message || "Supplier payment recorded.");
      setShowPaymentForm(false);
      setPaymentForm({
        amount: "",
        paymentMethod: "Cash",
        paymentDate: localDate(),
        reference: "",
      });
      setPaymentRequestKey("");
      setPaymentOutcomeUncertain(false);
      await loadPurchases();
    } catch (requestError) {
      const status = requestError.response?.status;
      const uncertain = !status || status >= 500;
      setPaymentOutcomeUncertain(uncertain);
      setPaymentError(
        uncertain
          ? "The payment result could not be confirmed. Retry this same payment to safely check whether it was recorded."
          : requestError.response?.data?.message ||
              "Unable to record supplier payment."
      );
      if (status === 409) {
        try {
          const refreshed = await purchaseService.getPurchase(editingPurchase._id);
          setEditingPurchase(refreshed.purchase);
          setPurchases((current) =>
            current.map((purchase) =>
              purchase._id === refreshed.purchase._id
                ? refreshed.purchase
                : purchase
            )
          );
          await loadPurchases();
        } catch (refreshError) {
          setPaymentError((current) =>
            `${current} Purchase refresh failed: ${
              refreshError.response?.data?.message ||
              "close and reopen the drawer to reload its latest balance."
            }`
          );
        }
      }
    } finally {
      setRecordingPayment(false);
    }
  };

  const cancelPayment = () => {
    setShowPaymentForm(false);
    setPaymentError("");
    setPaymentOutcomeUncertain(false);
    setPaymentRequestKey("");
  };

  const paymentSummary = editingPurchase
    ? getPaymentSummary(editingPurchase)
    : null;

  const paymentHistory = editingPurchase
    ? getPaymentHistory(editingPurchase)
    : [];

  const pricingFields = [
    "supplierState",
    "quantity",
    "pricePerUnit",
    "discountAmount",
    "gstRate",
    "priceIncludesGst",
  ];

  const hasUnsavedPricingChanges = Boolean(
    editForm &&
    editInitial &&
    pricingFields.some(
      (field) => editForm[field] !== editInitial[field]
    )
  );

  return (
    <main className="min-h-screen w-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Purchase History</h1>
            <p className="mt-1 text-sm text-slate-500">Review supplier invoices, GST, payments, and receipts.</p>
          </div>
          <Link to="/purchases" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">New Purchase</Link>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}

        {summary && (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Invoice total", summary.invoiceTotal],
              ["GST on purchases", summary.totalGst],
              ["Paid to suppliers", summary.amountPaid],
              ["Outstanding payable", summary.outstandingPayable],
            ].map(([label, amount]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{money(amount)}</p>
              </div>
            ))}
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <form onSubmit={handleApply} className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-slate-700">Search
              <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Supplier, invoice, product" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-sm font-medium text-slate-700">From
              <input type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="text-sm font-medium text-slate-700">To
              <input type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Apply</button>
              <button type="button" onClick={() => { const clean = { search: "", startDate: "", endDate: "" }; setFilters(clean); setAppliedFilters(clean); setPagination((previous) => ({ ...previous, page: 1 })); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">Reset</button>
            </div>
          </form>

          {loading && purchases.length === 0 ? (
            <p className="p-12 text-center text-sm text-slate-500">Loading purchase history...</p>
          ) : purchases.length === 0 ? (
            <p className="p-12 text-center text-sm text-slate-500">No purchase records found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3">Invoice #</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Taxable</th>
                      <th className="px-4 py-3">GST</th>
                      <th className="px-4 py-3">Invoice Total</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Payable</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchases.map((purchase) => {
                      const line = purchase.productSnapshot || {};
                      const open = expandedId === purchase._id;
                      return (
                        <Fragment key={purchase._id}>
                          <tr className="hover:bg-slate-50">
                            <td className="whitespace-nowrap px-4 py-4 text-slate-600">{formatDate(purchase.purchaseDate)}</td>
                            <td className="px-4 py-4 font-medium text-slate-900">{purchase.supplierName}</td>
                            <td className="px-4 py-4 text-slate-600">{purchase.invoiceNumber || "—"}</td>
                            <td className="px-4 py-4 text-slate-700">{line.name}</td>
                            <td className="whitespace-nowrap px-4 py-4">{money(line.taxableAmount)}</td>
                            <td className="whitespace-nowrap px-4 py-4">{money(line.totalGst)}</td>
                            <td className="whitespace-nowrap px-4 py-4 font-semibold">{money(line.invoiceTotal)}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-emerald-700">{money(purchase.amountPaid)}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-rose-700">{money(purchase.outstandingPayable)}</td>
                            <td className="px-4 py-4">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${purchase.status === "Received" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                {purchase.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <button type="button" disabled={actionId === purchase._id} onClick={() => handleEdit(purchase)} className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
                                Edit
                              </button>
                              <button type="button" onClick={() => setExpandedId(open ? "" : purchase._id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">
                                {open ? "Hide" : "GST"}
                              </button>
                              {purchase.status === "Draft" && (
                                <button type="button" disabled={actionId === purchase._id} onClick={() => handleReceive(purchase)} className="ml-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                                  {actionId === purchase._id ? "Receiving..." : "Receive"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {open && (
                            <tr key={`${purchase._id}-details`} className="bg-indigo-50/50">
                              <td colSpan={11} className="px-5 py-4">
                                <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                  <p>Supplier state: <strong>{purchase.supplierState || "—"}</strong></p>
                                  <p>Supplier GSTIN: <strong>{purchase.supplierGstin || "—"}</strong></p>
                                  <p>HSN: <strong>{line.hsnCode || "—"}</strong></p>
                                  <p>Quantity: <strong>{line.quantity} {line.unit}</strong></p>
                                  <p>Unit price: <strong>{money(line.pricePerUnit)}</strong></p>
                                  <p>Discount: <strong>{money(line.discountAmount)}</strong></p>
                                  <p>GST rate / mode: <strong>{line.gstRate}% / {line.priceIncludesGst ? "inclusive" : "exclusive"}</strong></p>
                                  <p>CGST / SGST / IGST: <strong>{money(line.cgstAmount)} / {money(line.sgstAmount)} / {money(line.igstAmount)}</strong></p>
                                  <p>Payment method: <strong>{purchase.paymentMethod}</strong></p>
                                  <p className="sm:col-span-2">Notes: <strong>{purchase.notes || "—"}</strong></p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm">
                <p className="text-slate-500">{pagination.totalItems} record(s) · Page {pagination.page} of {pagination.totalPages}</p>
                <div className="flex gap-2">
                  <button type="button" disabled={pagination.page <= 1 || loading} onClick={() => setPagination((previous) => ({ ...previous, page: previous.page - 1 }))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button>
                  <button type="button" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination((previous) => ({ ...previous, page: previous.page + 1 }))} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {editingPurchase && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-purchase-title"
            className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
              <div>
                <h2 id="edit-purchase-title" className="text-lg font-bold text-slate-900">Edit purchase</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Edit purchase details below. Payment information reflects
                  the saved purchase record.
                </p>
              </div>
              <button type="button" onClick={closeEdit} disabled={savingEdit || recordingPayment} aria-label="Close edit purchase" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Close</button>
            </header>

            <form onSubmit={handleSaveEdit} className="space-y-5 p-5 sm:p-7">
              {editError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editError}</p>}
              {loadingEditProducts && <p role="status" className="text-sm text-slate-500">Loading product choices...</p>}

              <section>
                <h3 className="text-sm font-semibold text-slate-900">Supplier and invoice</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Supplier name *
                    <input className={inputClass} value={editForm.supplierName} onChange={(event) => setEditForm({ ...editForm, supplierName: event.target.value })} required />
                  </label>
                  <label className={labelClass}>Supplier state *
                    <input className={inputClass} value={editForm.supplierState} onChange={(event) => setEditForm({ ...editForm, supplierState: event.target.value })} required />
                  </label>
                  <label className={labelClass}>Supplier GSTIN
                    <input className={inputClass} value={editForm.supplierGstin} onChange={(event) => setEditForm({ ...editForm, supplierGstin: event.target.value })} autoCapitalize="characters" />
                  </label>
                  <label className={labelClass}>Invoice number
                    <input className={inputClass} value={editForm.invoiceNumber} onChange={(event) => setEditForm({ ...editForm, invoiceNumber: event.target.value })} />
                  </label>
                  <label className={labelClass}>Purchase date *
                    <input type="date" className={inputClass} value={editForm.purchaseDate} onChange={(event) => setEditForm({ ...editForm, purchaseDate: event.target.value })} required />
                  </label>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-slate-900">Product, pricing, and GST</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className={`${labelClass} sm:col-span-2`}>Product *
                    <select className={inputClass} value={editForm.productId} onChange={(event) => setEditForm({ ...editForm, productId: event.target.value })} required disabled={loadingEditProducts}>
                      <option value="">Select a product</option>
                      {editProducts.map((product) => <option key={product._id} value={product._id}>{product.name}{product.active ? "" : " (inactive)"}</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>Quantity *
                    <input type="number" min="0.001" step="any" className={inputClass} value={editForm.quantity} onChange={(event) => setEditForm({ ...editForm, quantity: event.target.value })} required />
                  </label>
                  <label className={labelClass}>Purchase price per unit (₹) *
                    <input type="number" min="0" step="0.01" className={inputClass} value={editForm.pricePerUnit} onChange={(event) => setEditForm({ ...editForm, pricePerUnit: event.target.value })} required />
                  </label>
                  <label className={labelClass}>Discount (₹)
                    <input type="number" min="0" step="0.01" className={inputClass} value={editForm.discountAmount} onChange={(event) => setEditForm({ ...editForm, discountAmount: event.target.value })} />
                  </label>
                  <label className={labelClass}>GST rate
                    <select className={inputClass} value={editForm.gstRate} onChange={(event) => setEditForm({ ...editForm, gstRate: event.target.value })}>
                      {[0, 5, 12, 18, 28].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                    </select>
                  </label>
                  <label className={labelClass}>Price mode
                    <select className={inputClass} value={editForm.priceIncludesGst} onChange={(event) => setEditForm({ ...editForm, priceIncludesGst: event.target.value })}>
                      <option value="false">Excludes GST</option>
                      <option value="true">Includes GST</option>
                    </select>
                  </label>
                </div>
              </section>

              <label className={`${labelClass} border-t border-slate-100 pt-5`}>Notes
                <textarea rows={3} className={inputClass} value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
              </label>

              {paymentSummary && (
                <section
                  aria-labelledby="purchase-payment-title"
                  className="border-t border-slate-100 pt-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3
                        id="purchase-payment-title"
                        className="text-sm font-semibold text-slate-900"
                      >
                        Payment Information
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Saved purchase amounts. Editing this form does not
                        record a supplier payment.
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${paymentStatusClass[paymentSummary.status]
                        }`}
                    >
                      {paymentSummary.status}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <dt className="text-xs font-medium text-slate-500">
                        Purchase Total
                      </dt>

                      <dd className="mt-2 text-lg font-bold text-slate-900">
                        {paymentSummary.total === null
                          ? "Unavailable"
                          : money(paymentSummary.total)}
                      </dd>
                    </div>

                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                      <dt className="text-xs font-medium text-emerald-800">
                        Total Paid
                      </dt>

                      <dd className="mt-2 text-lg font-bold text-emerald-800">
                        {paymentSummary.paid === null
                          ? "Unavailable"
                          : money(paymentSummary.paid)}
                      </dd>
                    </div>

                    <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                      <dt className="text-xs font-medium text-amber-900">
                        Outstanding Amount
                      </dt>

                      <dd className="mt-2 text-lg font-bold text-amber-900">
                        {paymentSummary.outstanding === null
                          ? "Needs review"
                          : money(paymentSummary.outstanding)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Original payment method
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {editingPurchase.paymentMethod || "Not recorded"}
                      </p>
                    </div>

                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Preserved
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Payment History
                    </h4>
                    {paymentHistory.length === 0 ? (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-500">
                        No payments recorded.
                      </p>
                    ) : (
                      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[560px] text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-3 py-2.5 font-medium">Date</th>
                              <th className="px-3 py-2.5 font-medium">Amount</th>
                              <th className="px-3 py-2.5 font-medium">Method</th>
                              <th className="px-3 py-2.5 font-medium">Reference / note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {paymentHistory.map((payment) => (
                              <tr key={payment._id}>
                                <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                                  {formatDate(payment.paymentDate)}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-800">
                                  {money(payment.amount)}
                                </td>
                                <td className="px-3 py-2.5 text-slate-700">
                                  {payment.paymentMethod}
                                </td>
                                <td className="px-3 py-2.5 text-slate-600">
                                  {payment.reference || "—"}
                                  {payment.legacy && (
                                    <span className="ml-1 text-[10px] text-amber-700">
                                      (legacy)
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {paymentSuccess && (
                    <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      {paymentSuccess}
                    </p>
                  )}

                  {hasUnsavedPricingChanges && (
                    <p
                      role="status"
                      className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs leading-6 text-indigo-800"
                    >
                      You have unsaved pricing changes. These amounts still
                      reflect the saved purchase, not a recalculated preview.
                      Save or cancel those changes before recording a payment.
                    </p>
                  )}

                  {!paymentSummary.hasAmounts && (
                    <p
                      role="alert"
                      className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700"
                    >
                      Complete payment amounts were not returned for this
                      purchase. Payment information cannot be confirmed.
                    </p>
                  )}

                  {paymentSummary.hasExcessPayment && (
                    <p
                      role="alert"
                      className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-6 text-red-700"
                    >
                      Recorded payments exceed the saved purchase total by{" "}
                      {money(paymentSummary.excess)}. Resolve this through
                      the existing supplier credit, refund, or adjustment
                      workflow. Do not overwrite payment history.
                    </p>
                  )}

                  {paymentSummary.balanceMismatch &&
                    !paymentSummary.hasExcessPayment && (
                      <p
                        role="alert"
                        className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900"
                      >
                        The saved outstanding balance differs from purchase
                        total minus recorded paid amount. The balance shown
                        above is calculated from those amounts. Backend
                        reconciliation is required.
                      </p>
                    )}

                  {!showPaymentForm && paymentError && (
                    <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {paymentError}
                    </p>
                  )}

                  {!showPaymentForm && (
                    <button
                      type="button"
                      onClick={beginPayment}
                      disabled={
                        refreshingPayment ||
                        hasUnsavedPricingChanges ||
                        !paymentSummary.hasAmounts ||
                        paymentSummary.outstanding === null ||
                        paymentSummary.outstanding <= 0 ||
                        paymentSummary.hasExcessPayment
                      }
                      className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {refreshingPayment
                        ? "Refreshing balance..."
                        : "Record Payment"}
                    </button>
                  )}

                  {showPaymentForm && (
                    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Record supplier payment
                          </h4>
                          <p className="mt-1 text-xs text-slate-600">
                            Current outstanding:{" "}
                            <strong>
                              {paymentSummary.outstanding === null
                                ? "Unavailable"
                                : money(paymentSummary.outstanding)}
                            </strong>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={cancelPayment}
                          disabled={recordingPayment}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Cancel payment
                        </button>
                      </div>

                      {paymentError && (
                        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          {paymentError}
                        </p>
                      )}

                      {hasUnsavedPricingChanges && (
                        <p role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                          Save or cancel the unsaved pricing changes before submitting this payment.
                        </p>
                      )}

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className={labelClass}>
                          Payment amount (₹) *
                          <input
                            type="number"
                            min="0.01"
                            max={paymentSummary.outstanding ?? undefined}
                            step="0.01"
                            inputMode="decimal"
                            className={inputClass}
                            value={paymentForm.amount}
                            onChange={(event) => handlePaymentFieldChange("amount", event.target.value)}
                            disabled={recordingPayment || paymentOutcomeUncertain}
                            required
                          />
                        </label>
                        <label className={labelClass}>
                          Payment method *
                          <select
                            className={inputClass}
                            value={paymentForm.paymentMethod}
                            onChange={(event) => handlePaymentFieldChange("paymentMethod", event.target.value)}
                            disabled={recordingPayment || paymentOutcomeUncertain}
                            required
                          >
                            {paymentMethods.map((method) => (
                              <option key={method} value={method}>{method}</option>
                            ))}
                          </select>
                        </label>
                        <label className={labelClass}>
                          Payment date *
                          <input
                            type="date"
                            className={inputClass}
                            value={paymentForm.paymentDate}
                            onChange={(event) => handlePaymentFieldChange("paymentDate", event.target.value)}
                            disabled={recordingPayment || paymentOutcomeUncertain}
                            required
                          />
                        </label>
                        <label className={labelClass}>
                          Note / reference
                          <input
                            type="text"
                            maxLength={200}
                            className={inputClass}
                            value={paymentForm.reference}
                            onChange={(event) => handlePaymentFieldChange("reference", event.target.value)}
                            disabled={recordingPayment || paymentOutcomeUncertain}
                            placeholder="Transaction ID or note"
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={handleRecordPayment}
                        disabled={
                          recordingPayment ||
                          refreshingPayment ||
                          hasUnsavedPricingChanges ||
                          paymentSummary.outstanding === null
                        }
                        className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {recordingPayment
                          ? "Recording payment..."
                          : paymentOutcomeUncertain
                            ? "Retry Payment Safely"
                            : "Submit Payment"}
                      </button>
                    </div>
                  )}
                </section>
              )}

              <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeEdit} disabled={savingEdit || recordingPayment} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={savingEdit || recordingPayment || loadingEditProducts} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{savingEdit ? "Saving changes..." : "Save Changes"}</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
};

export default PurchaseHistory;
