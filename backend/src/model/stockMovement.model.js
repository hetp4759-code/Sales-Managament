import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "Opening Stock",
        "Purchase Receipt",
        "Sale",
        "Purchase Return",
        "Sale Return",
        "Manual Adjustment",
      ],
    },
    quantity: { type: Number, required: true, min: 0 },
    delta: { type: Number, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    idempotencyKey: { type: String, default: undefined },
    note: { type: String, trim: true, default: "" },
    balanceAfter: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true }
);

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);

export default StockMovement;
