import mongoose from "mongoose";
import { GST_RATES } from "../utils/gst.js";

const purchasePaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Other"],
    },
    paymentDate: { type: Date, required: true, default: Date.now },
    reference: { type: String, trim: true, maxlength: 200, default: "" },
    idempotencyKey: { type: String, required: true },
    legacy: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const purchaseSchema = new mongoose.Schema(
  {
    supplierName: { type: String, required: true, trim: true },
    supplierKey: { type: String, required: true, lowercase: true, trim: true },
    supplierGstin: { type: String, trim: true, uppercase: true, default: "" },
    supplierState: { type: String, required: true, trim: true },
    invoiceNumber: { type: String, trim: true, default: "" },
    invoiceKey: { type: String, lowercase: true, trim: true, default: "" },
    purchaseDate: { type: Date, default: Date.now },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productSnapshot: {
      name: { type: String, required: true },
      hsnCode: { type: String, default: "" },
      unit: { type: String, required: true },
      quantity: { type: Number, required: true, min: 0.000001 },
      pricePerUnit: { type: Number, required: true, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
      gstRate: { type: Number, enum: GST_RATES, default: 0 },
      priceIncludesGst: { type: Boolean, default: false },
      taxableAmount: { type: Number, required: true, min: 0 },
      cgstAmount: { type: Number, default: 0, min: 0 },
      sgstAmount: { type: Number, default: 0, min: 0 },
      igstAmount: { type: Number, default: 0, min: 0 },
      totalGst: { type: Number, default: 0, min: 0 },
      invoiceTotal: { type: Number, required: true, min: 0 },
    },
    amountPaid: { type: Number, required: true, min: 0, default: 0 },
    outstandingPayable: { type: Number, required: true, min: 0, default: 0 },
    payments: { type: [purchasePaymentSchema], default: [] },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Pending"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Other"],
      default: "Cash",
    },
    notes: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Draft", "Received"], default: "Draft" },
    receivedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

purchaseSchema.index(
  { supplierKey: 1, invoiceKey: 1 },
  { unique: true, partialFilterExpression: { invoiceKey: { $type: "string", $gt: "" } } }
);
purchaseSchema.index({ purchaseDate: -1, createdAt: -1 });
purchaseSchema.index(
  { "payments.idempotencyKey": 1 },
  { unique: true, sparse: true }
);

const Purchase = mongoose.model("Purchase", purchaseSchema);

export default Purchase;
