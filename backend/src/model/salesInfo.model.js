import mongoose from "mongoose";
import { GST_RATES } from "../utils/gst.js";

const salesInfoSchema = new mongoose.Schema(
  {
    sellerName: {
      type: String,
      required: true,
      trim: true,
    },
    sellerAddress: { type: String, trim: true, default: "" },
    sellerGstin: { type: String, trim: true, uppercase: true, default: "" },

    buyerName: {
      type: String,
      required: true,
      trim: true,
    },

    buyerPhone: {
      type: String,
      trim: true,
      default: "",
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    idempotencyKey: { type: String, default: undefined },
    idempotencyHash: { type: String, default: undefined },
    hsnCode: { type: String, trim: true, default: "" },
    buyerGstin: { type: String, trim: true, uppercase: true, default: "" },
    buyerState: { type: String, trim: true, default: "" },
    sellerState: { type: String, trim: true, default: "" },

    quantity: {
      type: Number,
      required: true,
      default: 1,
    },

    unit: {
      type: String,
      required: true,
      enum: ["Kg", "Litre", "Gram", "Packet", "Piece"],
      default: "Litre",
    },

    pricePerUnit: {
      type: Number,
      required: true,
      default: 0
    },
    discountAmount: { type: Number, min: 0, default: 0 },
    gstRate: { type: Number, enum: GST_RATES, default: null },
    priceIncludesGst: { type: Boolean, default: false },
    pricingMode: { type: String, enum: ["inclusive", "exclusive"], default: null },
    supplyType: {
      type: String,
      enum: ["not-applicable", "intra-state", "inter-state"],
      default: null,
    },
    taxableAmount: { type: Number, min: 0, default: null },
    cgstAmount: { type: Number, min: 0, default: null },
    sgstAmount: { type: Number, min: 0, default: null },
    igstAmount: { type: Number, min: 0, default: null },
    totalGst: { type: Number, min: 0, default: null },
    invoiceTotal: { type: Number, min: 0, default: null },
    businessSnapshot: {
      name: { type: String, default: "" },
      address: { type: String, default: "" },
      state: { type: String, default: "" },
      gstin: { type: String, default: "" },
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    amountReceived: {
      type: Number,
      default: 0,
      min: 0,
    },

    remainingBalance: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Paid", "Partial", "Pending"],
      default: "Pending",
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer","Card","Other"],
      default: "Cash",
    },

    notes: {
      type: String,
      default: "",
    },

    saleDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

salesInfoSchema.index({ saleDate: -1, createdAt: -1 });
salesInfoSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true }
);

const salesInfoModel = mongoose.model("salesInfo", salesInfoSchema);
export default salesInfoModel;
