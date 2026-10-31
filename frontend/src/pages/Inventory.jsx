import { useCallback, useEffect, useState } from "react";
import inventoryService from "../service/inventoryService";

const units = ["Piece", "Kg", "Litre", "Gram", "Packet"];
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const fieldClass = "block text-sm font-medium text-slate-700";

const initialForm = {
  name: "",
  sku: "",
  hsnCode: "",
  unit: "Piece",
  gstRate: "0",
  purchasePrice: "0",
  sellingPrice: "0",
  stock: "0",
  minimumStock: "0",
  description: "",
};

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const [adjustment, setAdjustment] = useState({ quantity: "", note: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productResponse, movementResponse] = await Promise.all([
        inventoryService.getProducts({ includeInactive: true }),
        inventoryService.getMovements({ limit: 50 }),
      ]);
      setProducts(productResponse.products || []);
      setMovements(movementResponse.movements || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load inventory. Try refreshing the page."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const startEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      hsnCode: product.hsnCode || "",
      unit: product.unit || "Piece",
      gstRate: String(product.gstRate ?? 0),
      purchasePrice: String(product.purchasePrice ?? 0),
      sellingPrice: String(product.sellingPrice ?? 0),
      stock: "0",
      minimumStock: String(product.minimumStock ?? 0),
      description: product.description || "",
    });
    setSuccess("");
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!form.name.trim()) {
      setError("Enter a product name.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        gstRate: Number(form.gstRate),
        purchasePrice: Number(form.purchasePrice),
        sellingPrice: Number(form.sellingPrice),
        minimumStock: Number(form.minimumStock),
        ...(!editingId && { stock: Number(form.stock) }),
      };
      if (editingId) {
        await inventoryService.updateProduct(editingId, payload);
      } else {
        await inventoryService.createProduct(payload);
      }
      resetForm();
      setSuccess(editingId ? "Product updated." : "Product added to inventory.");
      await loadInventory();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to save product. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustment = async (event) => {
    event.preventDefault();
    const quantity = Number(adjustment.quantity);
    if (!Number.isFinite(quantity) || quantity === 0) {
      setError("Enter a non-zero stock adjustment. Use a negative value to remove stock.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await inventoryService.adjustStock(adjustingProduct._id, adjustment);
      setAdjustingProduct(null);
      setAdjustment({ quantity: "", note: "" });
      setSuccess("Stock adjustment recorded in the movement history.");
      await loadInventory();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to adjust stock. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Inventory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage products, stock levels, and movement records.
            </p>
          </div>
          <button
            type="button"
            onClick={loadInventory}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {error && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? "Edit product" : "Add a product"}
          </h2>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className={fieldClass}>
              Product name *
              <input className={`${inputClass} mt-1.5`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label className={fieldClass}>
              SKU / Code
              <input className={`${inputClass} mt-1.5`} value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
            </label>
            <label className={fieldClass}>
              HSN code
              <input className={`${inputClass} mt-1.5`} value={form.hsnCode} onChange={(event) => setForm({ ...form, hsnCode: event.target.value })} />
            </label>
            <label className={fieldClass}>
              Unit
              <select className={`${inputClass} mt-1.5`} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
                {units.map((unit) => <option key={unit}>{unit}</option>)}
              </select>
            </label>
            <label className={fieldClass}>
              GST rate
              <select className={`${inputClass} mt-1.5`} value={form.gstRate} onChange={(event) => setForm({ ...form, gstRate: event.target.value })}>
                {[0, 5, 12, 18, 28].map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
              </select>
            </label>
            <label className={fieldClass}>
              Purchase price (₹)
              <input type="number" min="0" step="0.01" className={`${inputClass} mt-1.5`} value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })} />
            </label>
            <label className={fieldClass}>
              Selling price (₹)
              <input type="number" min="0" step="0.01" className={`${inputClass} mt-1.5`} value={form.sellingPrice} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} />
            </label>
            <label className={fieldClass}>
              Minimum stock
              <input type="number" min="0" step="any" className={`${inputClass} mt-1.5`} value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} />
            </label>
            {!editingId && (
              <label className={fieldClass}>
                Opening stock
                <input type="number" min="0" step="any" className={`${inputClass} mt-1.5`} value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
              </label>
            )}
            <label className={`${fieldClass} sm:col-span-2 lg:col-span-3`}>
              Description
              <textarea rows={2} className={`${inputClass} mt-1.5`} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? "Saving..." : editingId ? "Save changes" : "Add product"}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Products and stock</h2>
          </div>
          {loading && products.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading inventory...</p>
          ) : products.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No products yet. Add one above to track stock.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Product</th><th className="px-5 py-3">SKU / HSN</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Minimum</th><th className="px-5 py-3">GST</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr key={product._id} className={!product.active ? "opacity-50" : ""}>
                      <td className="px-5 py-4 font-medium text-slate-900">{product.name}<span className="ml-2 text-xs text-slate-500">{product.active ? "" : "Inactive"}</span></td>
                      <td className="px-5 py-4 text-slate-600">{product.sku || "—"} / {product.hsnCode || "—"}</td>
                      <td className={`px-5 py-4 font-semibold ${product.stock <= product.minimumStock ? "text-amber-700" : "text-slate-800"}`}>{product.stock} {product.unit}</td>
                      <td className="px-5 py-4 text-slate-600">{product.minimumStock} {product.unit}</td>
                      <td className="px-5 py-4 text-slate-600">{product.gstRate}%</td>
                      <td className="px-5 py-4 text-slate-600">₹{product.sellingPrice}</td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={() => startEdit(product)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50">Edit</button>
                          <button type="button" onClick={() => { setAdjustingProduct(product); setError(""); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Adjust stock</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent stock movements</h2>
          </div>
          {movements.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No stock movements recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-5 py-3">Date</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Movement</th><th className="px-5 py-3">Change</th><th className="px-5 py-3">Balance</th><th className="px-5 py-3">Note</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((movement) => (
                    <tr key={movement._id}>
                      <td className="whitespace-nowrap px-5 py-3 text-slate-600">{new Date(movement.createdAt).toLocaleString()}</td>
                      <td className="px-5 py-3 text-slate-800">{movement.productId?.name || "Product removed"}</td>
                      <td className="px-5 py-3 text-slate-600">{movement.type}</td>
                      <td className={`px-5 py-3 font-medium ${movement.delta > 0 ? "text-emerald-700" : "text-red-700"}`}>{movement.delta > 0 ? "+" : ""}{movement.delta}</td>
                      <td className="px-5 py-3">{movement.balanceAfter}</td>
                      <td className="px-5 py-3 text-slate-500">{movement.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={handleAdjustment} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Adjust {adjustingProduct.name} stock</h2>
            <p className="mt-1 text-sm text-slate-500">Current: {adjustingProduct.stock} {adjustingProduct.unit}. Use a negative quantity to remove stock.</p>
            <label className={`${fieldClass} mt-5`}>
              Quantity change
              <input autoFocus type="number" step="any" value={adjustment.quantity} onChange={(event) => setAdjustment({ ...adjustment, quantity: event.target.value })} className={`${inputClass} mt-1.5`} required />
            </label>
            <label className={`${fieldClass} mt-4`}>
              Note
              <input value={adjustment.note} onChange={(event) => setAdjustment({ ...adjustment, note: event.target.value })} className={`${inputClass} mt-1.5`} />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setAdjustingProduct(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Record adjustment"}</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

export default Inventory;
