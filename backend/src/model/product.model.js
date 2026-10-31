import mongoose from "mongoose";
import { GST_RATES } from "../utils/gst.js";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, uppercase: true, default: "" },
    hsnCode: { type: String, trim: true, default: "" },
    unit: {
      type: String,
      required: true,
      enum: ["Kg", "Litre", "Gram", "Packet", "Piece"],
      default: "Piece",
    },
    gstRate: { type: Number, enum: GST_RATES, default: 0 },
    purchasePrice: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },
    stock: { type: Number, min: 0, default: 0 },
    minimumStock: { type: Number, min: 0, default: 0 },
    description: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index(
  { sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: "string", $gt: "" } } }
);
productSchema.index({ name: 1, active: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
