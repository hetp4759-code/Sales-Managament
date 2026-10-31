import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import inventoryService from "../service/inventoryService";
import purchaseService from "../service/purchaseService";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const labelClass = "block text-sm font-medium text-slate-700";
const methods = ["Cash", "UPI", "Bank Transfer", "Card", "Other"];
const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const initialForm = {
  supplierName: "",
  supplierGstin: "",
  supplierState: "",
  invoiceNumber: "",
  purchaseDate: localDate(),
  productId: "",
  quantity: "1",
  pricePerUnit: "",
  discountAmount: "0",
  gstRate: "0",
  priceIncludesGst: false,
  amountPaid: "0",
  paymentMethod: "Cash",
  notes: "",
  receiveStock: false,
};

const PurchaseInfo = () => {
  const [form, setForm] = useState(initialForm);
  const [products, setProducts] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load products and business settings."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const product = products.find((item) => item._id === form.productId);
  const calculation = useMemo(() => {
    const quantity = Number(form.quantity) || 0;
    const price = Number(form.pricePerUnit) || 0;
    const discount = Number(form.discountAmount) || 0;
    const rate = Number(form.gstRate) || 0;
    const gross = Math.round(quantity * price * 100) / 100;
    const afterDiscount = Math.max(0, gross - discount);
    const taxableAmount =
      rate && form.priceIncludesGst
        ? Math.round((afterDiscount / (1 + rate / 100)) * 100) / 100
        : afterDiscount;
    const totalGst =
      rate && form.priceIncludesGst
        ? Math.round((afterDiscount - taxableAmount) * 100) / 100
        : Math.round((taxableAmount * rate) / 100 * 100) / 100;
    const supplierState = form.supplierState.trim().toLowerCase();
    const businessState = businessProfile?.state?.trim().toLowerCase();
    const sameState = supplierState && businessState && supplierState === businessState;
    const cgstAmount = sameState ? Math.round((totalGst / 2) * 100) / 100 : 0;
    const sgstAmount = sameState ? Math.round((totalGst - cgstAmount) * 100) / 100 : 0;
    const igstAmount = supplierState && businessState && !sameState ? totalGst : 0;
    return {
      taxableAmount,
      totalGst: rate ? totalGst : 0,
      invoiceTotal: Math.round((taxableAmount + (rate ? totalGst : 0)) * 100) / 100,
      cgstAmount,
      sgstAmount,
      igstAmount,
      stateError:
        rate && (!supplierState || !businessState)
          ? "Enter the supplier state and configure the business state before using GST."
          : "",
    };
  }, [
    form.quantity,
    form.pricePerUnit,
    form.discountAmount,
    form.gstRate,
    form.priceIncludesGst,
    form.supplierState,
    businessProfile?.state,
  ]);
  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value) || 0);

  const updateForm = (name, value) =>
    setForm((previous) => ({ ...previous, [name]: value }));

  const handleProductSelect = (event) => {
    const selected = products.find((item) => item._id === event.target.value);
    setForm((previous) => ({
      ...previous,
      productId: selected?._id || "",
      pricePerUnit: selected ? String(selected.purchasePrice) : "",
      gstRate: selected ? String(selected.gstRate) : "0",
      hsnCode: selected?.hsnCode || "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.supplierName.trim() || !form.supplierState.trim() || !product) {
      setError("Enter supplier details and select an inventory product.");
      return;
    }
    if (calculation.stateError) {
      setError(calculation.stateError);
      return;
    }
    if (Number(form.discountAmount) > Number(form.quantity) * Number(form.pricePerUnit)) {
      setError("Discount cannot exceed the purchase line amount.");
      return;
    }
    if (Number(form.amountPaid) > calculation.invoiceTotal) {
      setError("Amount paid cannot exceed the purchase invoice total.");
      return;
    }

    setSaving(true);
    try {
      const { purchase } = await purchaseService.createPurchase({
        ...form,
        supplierName: form.supplierName.trim(),
        supplierGstin: form.supplierGstin.trim(),
        supplierState: form.supplierState.trim(),
        quantity: Number(form.quantity),
        pricePerUnit: Number(form.pricePerUnit),
        discountAmount: Number(form.discountAmount) || 0,
        gstRate: Number(form.gstRate),
        amountPaid: Number(form.amountPaid) || 0,
        purchaseDate: `${form.purchaseDate}T12:00:00.000Z`,
      });
      setSuccess(
        purchase.status === "Received"
          ? "Purchase recorded. Stock was received and updated."
          : "Purchase saved as a draft. Inventory was not changed."
      );
      setForm(initialForm);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save the purchase. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Purchase Management</h1>
            <p className="mt-1 text-sm text-slate-500">Record supplier invoices and optionally receive stock.</p>
          </div>
          <Link to="/purchase-history" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">Purchase History</Link>
        </header>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
        {loading ? (
          <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Loading products...</p>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            Add products to inventory before entering purchases. <Link className="font-semibold underline" to="/inventory">Open Inventory</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <section>
              <h2 className="text-base font-semibold text-slate-900">Supplier and invoice</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className={labelClass}>Supplier name *
                  <input className={inputClass} value={form.supplierName} onChange={(event) => updateForm("supplierName", event.target.value)} required />
                </label>
                <label className={labelClass}>Supplier state *
                  <input className={inputClass} value={form.supplierState} onChange={(event) => updateForm("supplierState", event.target.value)} required />
                </label>
                <label className={labelClass}>Supplier GSTIN
                  <input className={inputClass} value={form.supplierGstin} onChange={(event) => updateForm("supplierGstin", event.target.value)} autoCapitalize="characters" />
                </label>
                <label className={labelClass}>Supplier invoice number
                  <input className={inputClass} value={form.invoiceNumber} onChange={(event) => updateForm("invoiceNumber", event.target.value)} />
                </label>
                <label className={labelClass}>Purchase date *
                  <input type="date" className={inputClass} value={form.purchaseDate} onChange={(event) => updateForm("purchaseDate", event.target.value)} required />
                </label>
                <label className={labelClass}>Payment method
                  <select className={inputClass} value={form.paymentMethod} onChange={(event) => updateForm("paymentMethod", event.target.value)}>
                    {methods.map((method) => <option key={method}>{method}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <h2 className="text-base font-semibold text-slate-900">Product and GST</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className={`${labelClass} sm:col-span-2 lg:col-span-3`}>Product *
                  <select className={inputClass} value={form.productId} onChange={handleProductSelect} required>
                    <option value="">Select a product</option>
                    {products.map((item) => <option key={item._id} value={item._id}>{item.name}{item.sku ? ` (${item.sku})` : ""} · {item.stock} {item.unit} available</option>)}
                  </select>
                </label>
                {product && <p className="sm:col-span-2 lg:col-span-3 -mt-2 text-xs text-slate-500">HSN: {form.hsnCode || "Not set"} · Business state: {businessProfile?.state || "Not configured"} (<Link to="/business-settings" className="font-medium text-indigo-600 underline">GST settings</Link>)</p>}
                <label className={labelClass}>Quantity *
                  <input type="number" min="0.001" step="any" className={inputClass} value={form.quantity} onChange={(event) => updateForm("quantity", event.target.value)} required />
                </label>
                <label className={labelClass}>Purchase price per unit (₹) *
                  <input type="number" min="0" step="0.01" className={inputClass} value={form.pricePerUnit} onChange={(event) => updateForm("pricePerUnit", event.target.value)} required />
                </label>
                <label className={labelClass}>Discount (₹)
                  <input type="number" min="0" step="0.01" className={inputClass} value={form.discountAmount} onChange={(event) => updateForm("discountAmount", event.target.value)} />
                </label>
                <label className={labelClass}>GST rate
                  <select className={inputClass} value={form.gstRate} onChange={(event) => updateForm("gstRate", event.target.value)}>
                    {[0, 5, 12, 18, 28].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                  </select>
                </label>
                <label className={labelClass}>Price mode
                  <select className={inputClass} value={form.priceIncludesGst ? "inclusive" : "exclusive"} onChange={(event) => updateForm("priceIncludesGst", event.target.value === "inclusive")}>
                    <option value="exclusive">Excludes GST</option>
                    <option value="inclusive">Includes GST</option>
                  </select>
                </label>
                <label className={labelClass}>Amount paid (₹)
                  <input type="number" min="0" step="0.01" className={inputClass} value={form.amountPaid} onChange={(event) => updateForm("amountPaid", event.target.value)} />
                </label>
              </div>
              {calculation.stateError && <p className="mt-3 text-sm text-amber-700">{calculation.stateError}</p>}
              <div className="mt-5 grid gap-3 rounded-xl bg-indigo-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>Taxable amount <strong className="block text-slate-900">{money(calculation.taxableAmount)}</strong></p>
                <p>CGST / SGST <strong className="block text-slate-900">{money(calculation.cgstAmount)} / {money(calculation.sgstAmount)}</strong></p>
                <p>IGST / Total GST <strong className="block text-slate-900">{money(calculation.igstAmount)} / {money(calculation.totalGst)}</strong></p>
                <p>Invoice total <strong className="block text-slate-900">{money(calculation.invoiceTotal)}</strong></p>
              </div>
            </section>

            <section className="border-t border-slate-100 pt-6">
              <label className={labelClass}>Notes
                <textarea rows={3} className={inputClass} value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} />
              </label>
              <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                <input type="checkbox" checked={form.receiveStock} onChange={(event) => updateForm("receiveStock", event.target.checked)} className="mt-0.5 h-4 w-4 accent-indigo-600" />
                <span><strong>Goods received</strong><span className="mt-1 block text-xs text-slate-500">Only checked purchases add stock and create a receipt movement. Unchecked purchases are saved as drafts.</span></span>
              </label>
            </section>
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Saving purchase..." : form.receiveStock ? "Record Purchase and Receive Stock" : "Save Purchase Draft"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default PurchaseInfo;
