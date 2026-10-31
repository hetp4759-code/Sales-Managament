import mongoose from "mongoose";
import BusinessProfile from "../model/businessProfile.model.js";
import Product from "../model/product.model.js";
import Purchase from "../model/purchase.model.js";
import {
  isValidObjectId,
  mutateStock,
  rollbackStockMutation,
  runInventoryOperation,
} from "../service/inventory.service.js";
import {
  getPurchaseStockAdjustments,
  validatePurchaseUpdate,
} from "../service/purchaseUpdate.service.js";
import {
  getPaymentAmounts,
  matchesExistingPayment,
  PAYMENT_METHODS,
  paymentExceedsBalance,
  validatePurchasePayment,
} from "../service/purchasePayment.service.js";
import { calculateGst, roundMoney, validateGstin } from "../utils/gst.js";

const paidStatus = (total, paid) => {
  const outstanding = roundMoney(total - paid);
  return {
    amountPaid: roundMoney(paid),
    outstandingPayable: outstanding,
    paymentStatus: outstanding === 0 ? "Paid" : paid > 0 ? "Partial" : "Pending",
  };
};

const handleError = (res, error, fallback) => {
  console.error(fallback, error);
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This supplier invoice number has already been recorded.",
    });
  }
  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : fallback,
  });
};

const dateFilter = (query) => {
  const filter = {};
  const { startDate, endDate, search } = query;

  const validDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  };

  if (startDate && !validDate(startDate)) {
    return { error: "Invalid start date. Use YYYY-MM-DD." };
  }
  if (endDate && !validDate(endDate)) {
    return { error: "Invalid end date. Use YYYY-MM-DD." };
  }
  if (startDate && endDate && startDate > endDate) {
    return { error: "Start date cannot be after end date." };
  }
  if (startDate || endDate) {
    filter.purchaseDate = {};
    if (startDate) filter.purchaseDate.$gte = new Date(`${startDate}T00:00:00.000Z`);
    if (endDate) {
      const exclusiveEnd = new Date(`${endDate}T00:00:00.000Z`);
      exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
      filter.purchaseDate.$lt = exclusiveEnd;
    }
  }
  if (typeof search === "string" && search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { supplierName: { $regex: escaped, $options: "i" } },
      { invoiceNumber: { $regex: escaped, $options: "i" } },
      { "productSnapshot.name": { $regex: escaped, $options: "i" } },
    ];
  }
  return { filter };
};

export const createPurchase = async (req, res) => {
  const input = req.body ?? {};
  const quantity = Number(input.quantity);
  const pricePerUnit = Number(input.pricePerUnit);
  const discountAmount = Number(input.discountAmount ?? 0);
  const gstRate = Number(input.gstRate ?? 0);
  const amountPaid = roundMoney(Number(input.amountPaid ?? 0));
  const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();
  const receiveStock = input.receiveStock === true;

  if (
    typeof input.supplierName !== "string" ||
    !input.supplierName.trim() ||
    typeof input.supplierState !== "string" ||
    !input.supplierState.trim() ||
    !isValidObjectId(input.productId) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(pricePerUnit) ||
    !Number.isFinite(discountAmount) ||
    !Number.isFinite(gstRate) ||
    !Number.isFinite(amountPaid) ||
    quantity <= 0 ||
    pricePerUnit < 0 ||
    discountAmount < 0 ||
    amountPaid < 0 ||
    Number.isNaN(purchaseDate.getTime()) ||
    (input.priceIncludesGst !== undefined && typeof input.priceIncludesGst !== "boolean") ||
    (input.notes !== undefined && typeof input.notes !== "string")
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter valid supplier, product, quantity, pricing, payment and purchase date details.",
    });
  }

  const gstinError = validateGstin(input.supplierGstin, "Supplier GSTIN");
  if (gstinError) return res.status(400).json({ success: false, message: gstinError });
  const paymentMethod = input.paymentMethod || "Cash";
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: "Invalid payment method." });
  }

  let stockChanged = false;
  const purchaseId = new mongoose.Types.ObjectId();

  try {
    const profile = await BusinessProfile.findOne({ key: "default" }).lean();
    const result = await runInventoryOperation(async (session) => {
      const productQuery = Product.findById(input.productId);
      if (session) productQuery.session(session);
      const product = await productQuery;
      if (!product || !product.active) {
        throw Object.assign(new Error("Select an active product."), { status: 404 });
      }

      const calculation = calculateGst({
        quantity,
        pricePerUnit,
        discountAmount,
        gstRate,
        priceIncludesGst: input.priceIncludesGst ?? false,
        supplierState: input.supplierState,
        customerState: profile?.state,
      });
      if (calculation.error) {
        throw Object.assign(new Error(calculation.error), { status: 400 });
      }

      const { data: tax } = calculation;
      if (amountPaid > tax.invoiceTotal) {
        throw Object.assign(new Error("Amount paid cannot exceed purchase total."), {
          status: 400,
        });
      }

      const purchase = new Purchase({
        _id: purchaseId,
        supplierName: input.supplierName.trim(),
        supplierKey: input.supplierName.trim().toLowerCase(),
        supplierGstin: (input.supplierGstin || "").trim().toUpperCase(),
        supplierState: input.supplierState.trim(),
        invoiceNumber: (input.invoiceNumber || "").trim(),
        invoiceKey: (input.invoiceNumber || "").trim().toLowerCase(),
        purchaseDate,
        productId: product._id,
        productSnapshot: {
          name: product.name,
          hsnCode:
            typeof input.hsnCode === "string" ? input.hsnCode.trim() : product.hsnCode,
          unit: product.unit,
          quantity,
          pricePerUnit: roundMoney(pricePerUnit),
          discountAmount: roundMoney(discountAmount),
          ...tax,
        },
        ...paidStatus(tax.invoiceTotal, amountPaid),
        payments:
          amountPaid > 0
            ? [
                {
                  amount: roundMoney(amountPaid),
                  paymentMethod,
                  paymentDate: new Date(),
                  reference: "Payment recorded with purchase",
                  idempotencyKey: `initial:${purchaseId}`,
                },
              ]
            : [],
        paymentMethod,
        notes: (input.notes || "").trim(),
        status: "Draft",
      });

      await purchase.save(session ? { session } : undefined);
      if (receiveStock) {
        await mutateStock({
          productId: product._id,
          delta: quantity,
          type: "Purchase Receipt",
          referenceId: purchase._id,
          note: `Supplier invoice ${purchase.invoiceNumber || "(not supplied)"}`,
          session,
        });
        stockChanged = !session;
        purchase.status = "Received";
        purchase.receivedAt = new Date();
        await purchase.save(session ? { session } : undefined);
      }
      return purchase;
    });

    return res.status(201).json({
      success: true,
      message: receiveStock
        ? "Purchase recorded and stock received."
        : "Purchase draft recorded. Stock has not changed.",
      purchase: result,
    });
  } catch (error) {
    if (stockChanged) {
      try {
        await rollbackStockMutation({
          productId: req.body.productId,
          delta: quantity,
          type: "Manual Adjustment",
          referenceId: purchaseId,
          note: "Purchase receipt rollback after failed save.",
        });
      } catch (rollbackError) {
        console.error("Purchase stock rollback failed:", rollbackError);
      }
    }
    await Purchase.deleteOne({ _id: purchaseId }).catch((cleanupError) => {
      console.error("Failed purchase cleanup:", cleanupError);
    });
    return handleError(res, error, "Unable to record purchase.");
  }
};

export const updatePurchase = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid purchase ID." });
  }

  const { updates, error: validationError } = validatePurchaseUpdate(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const standaloneStockChanges = [];
  try {
    const profile = await BusinessProfile.findOne({ key: "default" }).lean();
    const result = await runInventoryOperation(async (session) => {
      const purchaseQuery = Purchase.findById(req.params.id);
      if (session) purchaseQuery.session(session);
      const purchase = await purchaseQuery;
      if (!purchase) {
        throw Object.assign(new Error("Purchase not found."), { status: 404 });
      }

      const oldProductId = purchase.productId;
      const productChanged =
        updates.productId !== undefined &&
        String(updates.productId) !== String(oldProductId);
      let replacementProduct = null;
      if (productChanged) {
        const productQuery = Product.findById(updates.productId);
        if (session) productQuery.session(session);
        replacementProduct = await productQuery;
        if (!replacementProduct || !replacementProduct.active) {
          throw Object.assign(new Error("Select an active product."), { status: 400 });
        }
      }

      const productId = replacementProduct?._id || oldProductId;
      const previousSnapshot = purchase.toObject().productSnapshot;
      const snapshot = {
        ...previousSnapshot,
        ...(replacementProduct && {
          name: replacementProduct.name,
          hsnCode: replacementProduct.hsnCode || "",
          unit: replacementProduct.unit,
        }),
      };
      const quantity = updates.quantity ?? snapshot.quantity;
      const pricePerUnit = updates.pricePerUnit ?? snapshot.pricePerUnit;
      const discountAmount = updates.discountAmount ?? snapshot.discountAmount;
      const gstRate = updates.gstRate ?? snapshot.gstRate;
      const priceIncludesGst =
        updates.priceIncludesGst ?? snapshot.priceIncludesGst;
      const supplierState = updates.supplierState ?? purchase.supplierState;
      const pricingChanged = [
        "quantity",
        "pricePerUnit",
        "discountAmount",
        "gstRate",
        "priceIncludesGst",
        "supplierState",
      ].some((field) => updates[field] !== undefined);

      if (pricingChanged) {
        const calculation = calculateGst({
          quantity,
          pricePerUnit,
          discountAmount,
          gstRate,
          priceIncludesGst,
          supplierState,
          customerState: profile?.state,
        });
        if (calculation.error) {
          throw Object.assign(new Error(calculation.error), { status: 400 });
        }
        if (
          Object.values(calculation.data).some(
            (value) => typeof value === "number" && !Number.isFinite(value)
          )
        ) {
          throw Object.assign(new Error("Purchase amounts are outside the supported range."), {
            status: 400,
          });
        }

        if (roundMoney(purchase.amountPaid) > calculation.data.invoiceTotal) {
          throw Object.assign(
            new Error(
              "Updated purchase total cannot be lower than the amount already paid. Handle the payment adjustment separately."
            ),
            { status: 400 }
          );
        }

        Object.assign(snapshot, {
          quantity,
          pricePerUnit: roundMoney(pricePerUnit),
          discountAmount: roundMoney(discountAmount),
          ...calculation.data,
        });
        purchase.outstandingPayable = roundMoney(
          calculation.data.invoiceTotal - purchase.amountPaid
        );
        purchase.paymentStatus =
          purchase.outstandingPayable === 0
            ? "Paid"
            : purchase.amountPaid > 0
              ? "Partial"
              : "Pending";
      }

      for (const [field, value] of Object.entries(updates)) {
        if (
          field !== "productId" &&
          field !== "quantity" &&
          field !== "pricePerUnit" &&
          field !== "discountAmount" &&
          field !== "gstRate" &&
          field !== "priceIncludesGst"
        ) {
          purchase[field] = value;
        }
      }

      if (updates.supplierName !== undefined) {
        purchase.supplierKey = updates.supplierName.toLowerCase();
      }
      if (updates.invoiceNumber !== undefined) {
        purchase.invoiceKey = updates.invoiceNumber.toLowerCase();
      }
      purchase.productId = productId;
      purchase.productSnapshot = snapshot;

      if (purchase.status === "Received") {
        const adjustments = getPurchaseStockAdjustments({
          oldProductId,
          newProductId: productId,
          oldQuantity: previousSnapshot.quantity,
          newQuantity: quantity,
        });
        for (const adjustment of adjustments) {
          await mutateStock({
            ...adjustment,
            type: adjustment.delta < 0 ? "Purchase Return" : "Purchase Receipt",
            referenceId: purchase._id,
            note: `Stock correction for edited supplier invoice ${purchase.invoiceNumber || "(not supplied)"}`,
            session,
          });
          if (!session) standaloneStockChanges.push(adjustment);
        }
      }

      const set = {};
      for (const field of purchase.modifiedPaths()) {
        if (field !== "amountPaid" && field !== "payments") {
          set[field] = purchase.get(field);
        }
      }

      const updateFilter = { _id: purchase._id };
      if (pricingChanged) {
        updateFilter.amountPaid = purchase.amountPaid;
      }
      const updateResult = await Purchase.updateOne(
        updateFilter,
        { $set: set },
        { runValidators: true, ...(session && { session }) }
      );
      if (updateResult.matchedCount !== 1) {
        throw Object.assign(
          new Error(
            "Purchase payment or details changed concurrently. Refresh the purchase and try again."
          ),
          { status: 409 }
        );
      }

      return purchase;
    });

    return res.json({
      success: true,
      message: "Purchase updated successfully.",
      purchase: result,
    });
  } catch (requestError) {
    let stockRollbackFailed = false;
    for (const change of standaloneStockChanges.reverse()) {
      try {
        await rollbackStockMutation({
          ...change,
          type: "Manual Adjustment",
          referenceId: req.params.id,
          note: "Purchase stock correction rollback after failed update.",
        });
      } catch (rollbackError) {
        stockRollbackFailed = true;
        console.error("Purchase update stock rollback failed:", rollbackError);
      }
    }

    if (stockRollbackFailed) {
      return res.status(500).json({
        success: false,
        message:
          "Purchase update failed and stock rollback was incomplete. Contact support before retrying.",
      });
    }
    return handleError(res, requestError, "Unable to update purchase.");
  }
};

export const receivePurchase = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid purchase ID." });
  }

  let stockChanged = false;
  try {
    const result = await runInventoryOperation(async (session) => {
      const query = Purchase.findById(req.params.id);
      if (session) query.session(session);
      const purchase = await query;
      if (!purchase) throw Object.assign(new Error("Purchase not found."), { status: 404 });
      if (purchase.status === "Received") {
        throw Object.assign(new Error("Purchase stock has already been received."), {
          status: 409,
        });
      }

      await mutateStock({
        productId: purchase.productId,
        delta: purchase.productSnapshot.quantity,
        type: "Purchase Receipt",
        referenceId: purchase._id,
        note: `Supplier invoice ${purchase.invoiceNumber || "(not supplied)"}`,
        session,
      });
      stockChanged = !session;
      purchase.status = "Received";
      purchase.receivedAt = new Date();
      await purchase.save(session ? { session } : undefined);
      return purchase;
    });
    return res.json({ success: true, message: "Purchase received and stock updated.", purchase: result });
  } catch (error) {
    if (stockChanged) {
      const purchase = await Purchase.findById(req.params.id).lean();
      if (purchase) {
        try {
          await rollbackStockMutation({
            productId: purchase.productId,
            delta: purchase.productSnapshot.quantity,
            type: "Manual Adjustment",
            referenceId: purchase._id,
            note: "Purchase receipt rollback after status update failure.",
          });
        } catch (rollbackError) {
          console.error("Purchase receipt rollback failed:", rollbackError);
        }
      }
    }
    return handleError(res, error, "Unable to receive purchase.");
  }
};

export const updatePurchasePayment = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid purchase ID." });
  }
  const { payment, error: validationError } = validatePurchasePayment(req.body);
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const purchaseId = new mongoose.Types.ObjectId(req.params.id);
  const paymentDateProvided = req.body.paymentDate !== undefined;
  const paymentRecord = {
    _id: new mongoose.Types.ObjectId(),
    ...payment,
    legacy: false,
  };
  const paidAfterPayment = {
    $round: [
      { $add: [{ $ifNull: ["$amountPaid", 0] }, payment.amount] },
      2,
    ],
  };
  const currentPayments = { $ifNull: ["$payments", []] };
  const paymentHistoryAfterPayment = {
    $let: {
      vars: { existingPayments: currentPayments },
      in: {
        $let: {
          vars: {
            recordedAmount: {
              $sum: {
                $map: {
                  input: "$$existingPayments",
                  as: "payment",
                  in: { $ifNull: ["$$payment.amount", 0] },
                },
              },
            },
          },
          in: {
            $concatArrays: [
              "$$existingPayments",
              {
                $cond: [
                  {
                    $gt: [
                      {
                        $subtract: [
                          { $ifNull: ["$amountPaid", 0] },
                          "$$recordedAmount",
                        ],
                      },
                      0,
                    ],
                  },
                  [
                    {
                      _id: new mongoose.Types.ObjectId(),
                      amount: {
                        $subtract: [
                          { $ifNull: ["$amountPaid", 0] },
                          "$$recordedAmount",
                        ],
                      },
                      paymentMethod: { $ifNull: ["$paymentMethod", "Other"] },
                      paymentDate: {
                        $ifNull: ["$createdAt", "$purchaseDate"],
                      },
                      reference: "Previously recorded payment",
                      idempotencyKey: {
                        $concat: ["legacy:", { $toString: "$_id" }],
                      },
                      legacy: true,
                    },
                  ],
                  [],
                ],
              },
              [{ $literal: paymentRecord }],
            ],
          },
        },
      },
    },
  };

  try {
    const updatedPurchase = await Purchase.findOneAndUpdate(
      {
        _id: purchaseId,
        $nor: [
          {
            payments: {
              $elemMatch: { idempotencyKey: payment.idempotencyKey },
            },
          },
        ],
        $expr: {
          $lte: [
            {
              $add: [
                { $ifNull: ["$amountPaid", 0] },
                payment.amount,
              ],
            },
            "$productSnapshot.invoiceTotal",
          ],
        },
      },
      [
        {
          $set: {
            amountPaid: paidAfterPayment,
            outstandingPayable: {
              $round: [
                {
                  $subtract: [
                    "$productSnapshot.invoiceTotal",
                    paidAfterPayment,
                  ],
                },
                2,
              ],
            },
            paymentStatus: {
              $switch: {
                branches: [
                  {
                    case: {
                      $gte: [
                        paidAfterPayment,
                        "$productSnapshot.invoiceTotal",
                      ],
                    },
                    then: "Paid",
                  },
                  { case: { $gt: [paidAfterPayment, 0] }, then: "Partial" },
                ],
                default: "Pending",
              },
            },
            payments: paymentHistoryAfterPayment,
          },
        },
      ],
      { returnDocument: "after", lean: true, updatePipeline: true }
    );

    if (updatedPurchase) {
      return res.json({
        success: true,
        message: "Supplier payment recorded.",
        purchase: updatedPurchase,
      });
    }

    const currentPurchase = await Purchase.findById(purchaseId).lean();
    if (!currentPurchase) {
      return res.status(404).json({ success: false, message: "Purchase not found." });
    }

    const previousPayment = (currentPurchase.payments || []).find(
      (item) => item.idempotencyKey === payment.idempotencyKey
    );
    if (previousPayment) {
      if (matchesExistingPayment(previousPayment, payment, paymentDateProvided)) {
        return res.json({
          success: true,
          message: "Supplier payment was already recorded.",
          duplicate: true,
          purchase: currentPurchase,
        });
      }
      return res.status(409).json({
        success: false,
        message: "This payment request key was already used for different payment details.",
      });
    }

    const amounts = getPaymentAmounts(
      currentPurchase.productSnapshot.invoiceTotal,
      currentPurchase.amountPaid
    );
    if (
      paymentExceedsBalance(
        currentPurchase.productSnapshot.invoiceTotal,
        currentPurchase.amountPaid,
        payment.amount
      )
    ) {
      return res.status(409).json({
        success: false,
        message: `Payment exceeds the current outstanding balance of ${amounts.outstandingPayable.toFixed(2)}.`,
      });
    }

    return res.status(409).json({
      success: false,
      message: "Purchase payment changed concurrently. Refresh the purchase and try again.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This payment request key has already been used.",
      });
    }
    return handleError(res, error, "Unable to update purchase payment.");
  }
};

export const getPurchases = async (req, res) => {
  const { filter, error } = dateFilter(req.query);
  if (error) return res.status(400).json({ success: false, message: error });

  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 100);
  try {
    const [purchases, totalItems, summary] = await Promise.all([
      Purchase.find(filter)
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(filter),
      Purchase.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            invoiceTotal: { $sum: "$productSnapshot.invoiceTotal" },
            totalGst: { $sum: "$productSnapshot.totalGst" },
            amountPaid: { $sum: "$amountPaid" },
            outstandingPayable: { $sum: "$outstandingPayable" },
          },
        },
      ]),
    ]);

    return res.json({
      success: true,
      purchases,
      summary: summary[0] || {
        invoiceTotal: 0,
        totalGst: 0,
        amountPaid: 0,
        outstandingPayable: 0,
      },
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(Math.ceil(totalItems / limit), 1),
      },
    });
  } catch (requestError) {
    return handleError(res, requestError, "Unable to fetch purchases.");
  }
};

export const getPurchase = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid purchase ID." });
  }
  try {
    const purchase = await Purchase.findById(req.params.id).lean();
    if (!purchase) return res.status(404).json({ success: false, message: "Purchase not found." });
    return res.json({ success: true, purchase });
  } catch (error) {
    return handleError(res, error, "Unable to fetch purchase.");
  }
};
