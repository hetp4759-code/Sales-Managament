import mongoose from "mongoose"
import salesModel from "../model/salesInfo.model.js";
import BusinessProfile from "../model/businessProfile.model.js";
import Product from "../model/product.model.js";
import {
  isValidObjectId,
  mutateStock,
  rollbackStockMutation,
  runInventoryOperation,
} from "../service/inventory.service.js";
import {
  hashSaleRequest,
  isValidSaleIdempotencyKey,
} from "../service/saleIdempotency.service.js";
import { calculateGst, roundMoney, validateGstin } from "../utils/gst.js";

const IST_OFFSET_MS = 330 * 60 * 1000;
const ALLOWED_UNITS = ["Kg", "Litre", "Gram", "Packet", "Piece"];
const ALLOWED_PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer","Card" ,"Other"];
const EDITABLE_FIELDS = [
  "sellerName",
  "sellerAddress",
  "sellerGstin",
  "sellerState",
  "buyerName",
  "buyerPhone",
  "buyerGstin",
  "buyerState",
  "saleDate",
  "productId",
  "productName",
  "hsnCode",
  "quantity",
  "unit",
  "pricePerUnit",
  "discountAmount",
  "gstRate",
  "priceIncludesGst",
  "amountReceived",
  "paymentMethod",
  "notes",
];

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === "string" && value.trim() === "");

const cleanString = (value) => (typeof value === "string" ? value.trim() : "");

const toNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
};

const round2 = (value) => Number((Number(value) || 0).toFixed(2));

const validateSale = (input, { product = null, profile = null } = {}) => {
  const sellerName = cleanString(input.sellerName) || cleanString(profile?.name);
  const buyerName = cleanString(input.buyerName);
  const productName = product?.name || cleanString(input.productName);
  const productId = isBlank(input.productId) ? null : input.productId;

  if (
    !sellerName ||
    !buyerName ||
    !productName ||
    isBlank(input.quantity) ||
    isBlank(input.pricePerUnit) ||
    isBlank(input.unit)
  ) {
    return { error: "Please fill all required fields." };
  }

  if (productId && !mongoose.isValidObjectId(productId)) {
    return { error: "Invalid product selected." };
  }

  const quantity = toNumber(input.quantity);
  const pricePerUnit = isBlank(input.pricePerUnit) && product
    ? Number(product.sellingPrice)
    : toNumber(input.pricePerUnit);
  const amountReceived = isBlank(input.amountReceived)
    ? 0
    : toNumber(input.amountReceived);
  const discountAmount = isBlank(input.discountAmount)
    ? 0
    : toNumber(input.discountAmount);

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(pricePerUnit) ||
    !Number.isFinite(amountReceived) ||
    !Number.isFinite(discountAmount) ||
    quantity <= 0 ||
    pricePerUnit < 0 ||
    amountReceived < 0 ||
    discountAmount < 0
  ) {
    return { error: "Enter valid quantity, price and payment amount." };
  }

  const unit = product?.unit || input.unit;
  if (!ALLOWED_UNITS.includes(unit)) {
    return { error: "Invalid unit selected." };
  }

  const hsnCode =
    typeof input.hsnCode === "string"
      ? input.hsnCode.trim()
      : product?.hsnCode || "";
  const buyerGstin = cleanString(input.buyerGstin).toUpperCase();
  const gstinError = validateGstin(buyerGstin, "Buyer GSTIN");
  if (gstinError) return { error: gstinError };
  const sellerGstin = cleanString(input.sellerGstin || profile?.gstin).toUpperCase();
  const sellerGstinError = validateGstin(sellerGstin, "Business GSTIN");
  if (sellerGstinError) return { error: sellerGstinError };

  const gstRateInput =
    input.gstRate === undefined && product ? product.gstRate : input.gstRate;
  const hasGst = gstRateInput !== undefined && gstRateInput !== null;
  const gstRate = hasGst ? toNumber(gstRateInput) : null;
  const priceIncludesGst =
    input.priceIncludesGst === undefined
      ? false
      : input.priceIncludesGst;
  if (hasGst && typeof priceIncludesGst !== "boolean") {
    return { error: "Select whether the entered price includes GST." };
  }
  const sellerState =
    cleanString(input.sellerState) || cleanString(profile?.state);
  const buyerState = cleanString(input.buyerState);
  let tax = null;
  if (hasGst) {
    const calculation = calculateGst({
      quantity,
      pricePerUnit,
      discountAmount,
      gstRate,
      priceIncludesGst,
      supplierState: sellerState,
      customerState: buyerState,
    });
    if (calculation.error) return { error: calculation.error };
    tax = calculation.data;
  }

  const paymentMethod = isBlank(input.paymentMethod)
    ? "Cash"
    : input.paymentMethod;

  if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
    return { error: "Invalid payment method." };
  }

  const totalAmount = tax
    ? tax.invoiceTotal
    : round2(quantity * pricePerUnit - discountAmount);
  if (totalAmount < 0) {
    return { error: "Discount cannot exceed the line amount." };
  }
  const received = round2(amountReceived);

  if (received > totalAmount) {
    return { error: "Received amount cannot exceed total amount." };
  }

  const remainingBalance = round2(totalAmount - received);
  const paymentStatus =
    remainingBalance === 0 ? "Paid" : received > 0 ? "Partial" : "Pending";

  let saleDate = new Date();

  if (!isBlank(input.saleDate)) {
    const isDateLike =
      typeof input.saleDate === "string" || input.saleDate instanceof Date;
    saleDate = isDateLike ? new Date(input.saleDate) : new Date(NaN);

    if (Number.isNaN(saleDate.getTime())) {
      return { error: "Invalid sale date." };
    }
  }

  if (
    (input.buyerPhone !== undefined && typeof input.buyerPhone !== "string") ||
    (input.notes !== undefined && typeof input.notes !== "string")
  ) {
    return { error: "Phone number and notes must be text." };
  }

  return {
    data: {
      sellerName,
      sellerState,
      sellerGstin,
      sellerAddress: cleanString(input.sellerAddress || profile?.address),
      businessSnapshot: {
        name: sellerName,
        address: cleanString(input.sellerAddress || profile?.address),
        state: sellerState,
        gstin: sellerGstin,
      },
      buyerName,
      buyerPhone: cleanString(input.buyerPhone),
      buyerGstin,
      buyerState,
      productName,
      productId,
      hsnCode,
      quantity,
      unit,
      pricePerUnit,
      discountAmount: round2(discountAmount),
      ...(tax || {
        gstRate: null,
        priceIncludesGst: false,
        pricingMode: null,
        supplyType: null,
        taxableAmount: null,
        cgstAmount: null,
        sgstAmount: null,
        igstAmount: null,
        totalGst: null,
        invoiceTotal: null,
      }),
      totalAmount,
      amountReceived: received,
      remainingBalance,
      paymentStatus,
      paymentMethod,
      notes: cleanString(input.notes),
      saleDate,
    },
  };
};

const handleControllerError = (res, error, label, fallbackMessage) => {
  console.error(`${label}:`, error);

  if (Number.isInteger(error.status)) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "This sale conflicts with an existing record.",
    });
  }

  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }));

    return res.status(400).json({
      success: false,
      message: "Invalid sale data",
      errors,
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid value for "${error.path}".`,
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

/* 
      CREATE SALE
      @ POST /api/sales/sales-info
      */
export const createSale = async (req, res) => {
  let standaloneStockChange = null;
  let stockRollbackFailed = false;
  const saleId = new mongoose.Types.ObjectId();
  const body = req.body ?? {};
  const idempotencyKey = body.idempotencyKey;

  if (!isValidSaleIdempotencyKey(idempotencyKey)) {
    return res.status(400).json({
      success: false,
      message: "A valid sale request key is required.",
    });
  }
  const idempotencyHash = hashSaleRequest(body);

  try {
    const previousSale = await salesModel.findOne({ idempotencyKey }).lean();
    if (previousSale) {
      if (previousSale.idempotencyHash !== idempotencyHash) {
        return res.status(409).json({
          success: false,
          message: "This sale request key was already used for different sale details.",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Sale record was already created.",
        duplicate: true,
        sale: previousSale,
      });
    }

    const profile = await BusinessProfile.findOne({ key: "default" }).lean();
    const sale = await runInventoryOperation(async (session) => {
      let product = null;
      if (!isBlank(body.productId)) {
        if (!mongoose.isValidObjectId(body.productId)) {
          throw Object.assign(new Error("Invalid product selected."), {
            status: 400,
          });
        }
        const query = Product.findById(body.productId);
        if (session) query.session(session);
        product = await query;
        if (!product || !product.active) {
          throw Object.assign(new Error("Selected product is not available."), {
            status: 404,
          });
        }
      }

      const { error, data } = validateSale(body, { product, profile });
      if (error) throw Object.assign(new Error(error), { status: 400 });

      if (product) {
        await mutateStock({
          productId: product._id,
          delta: -data.quantity,
          type: "Sale",
          referenceId: saleId,
          idempotencyKey,
          note: `Sale to ${data.buyerName}`,
          session,
        });
        if (!session) {
          standaloneStockChange = {
            productId: product._id,
            delta: -data.quantity,
          };
        }
      }

      const newSale = new salesModel({
        ...data,
        _id: saleId,
        idempotencyKey,
        idempotencyHash,
      });
      await newSale.save(session ? { session } : undefined);
      return newSale;
    });

    return res.status(201).json({
      success: true,
      message: "Sale record created successfully.",
      sale,
    });
  } catch (error) {
    if (standaloneStockChange) {
      try {
        await rollbackStockMutation({
          ...standaloneStockChange,
          type: "Sale Return",
          referenceId: saleId,
          note: "Sale stock rollback after failed sale save.",
        });
      } catch (rollbackError) {
        stockRollbackFailed = true;
        console.error("Sale stock rollback failed:", rollbackError);
      }
    }

    if (stockRollbackFailed) {
      return res.status(500).json({
        success: false,
        message:
          "Sale creation failed and stock rollback was incomplete. Contact support before retrying.",
      });
    }

    if (error.code === 11000) {
      try {
        const duplicateSale = await salesModel.findOne({ idempotencyKey }).lean();
        if (duplicateSale) {
          if (duplicateSale.idempotencyHash !== idempotencyHash) {
            return res.status(409).json({
              success: false,
              message:
                "This sale request key was already used for different sale details.",
            });
          }
          return res.status(200).json({
            success: true,
            message: "Sale record was already created.",
            duplicate: true,
            sale: duplicateSale,
          });
        }
        return res.status(409).json({
          success: false,
          message:
            "A sale using this request key is still being processed. Retry the same request with the same key.",
        });
      } catch (lookupError) {
        console.error("Sale idempotency lookup failed:", lookupError);
        return res.status(500).json({
          success: false,
          message: "Unable to confirm whether the sale was already created.",
        });
      }
    }

    return handleControllerError(
      res,
      error,
      "Error creating sale",
      "Internal server error."
    );
  }
};

/*
  GET ALL SALES
    @ GET /api/sales/sales-info 
 */

export const getAllSales = async (req,res) =>{
    try {
        const sales = await salesModel.find().lean()

        res.status(200).json({
            success:true,
            message:"All sales fetched successfully.",
            sales:sales
        })
    } catch (error) {
        console.error("Error fetching get All sales", error);

        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

 /*
 GET SINGLE SALE
 @ GET /api/sales/sales-info/:id

 */

export const getSingleSale = async (req,res)=>{
    try {
        const { id } = req.params;
        // invalid sales id

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID.",
      });
    }

    // find the sale 
    const sale = await salesModel.findById(id).lean();

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale record not found.",
      });
    }

    res.status(200).json({
        success:true,
        message:"Sale record fetched successfully.",
        sale:sale
    })
    } catch (error) {
        console.error("Error fetching sales:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
}

/*
GET SALES HISTORY WITHIN DATE RANGE
@ GET /api/sales/sales-info/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
*/
export const getSalesHistory = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;

    const filter = {};

    // Helper: validate YYYY-MM-DD format and actual calendar date
    const isValidDate = (value) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
      }

      const [year, month, day] = value.split("-").map(Number);
      const parsedDate = new Date(Date.UTC(year, month - 1, day));

      return (
        parsedDate.getUTCFullYear() === year &&
        parsedDate.getUTCMonth() === month - 1 &&
        parsedDate.getUTCDate() === day
      );
    };

    // Single date and date range cannot be used together
    if (date && (startDate || endDate)) {
      return res.status(400).json({
        success: false,
        message: "Use either date or startDate/endDate, not both.",
      });
    }

    // Filter by a single date
    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date. Use YYYY-MM-DD.",
        });
      }

      const [year, month, day] = date.split("-").map(Number);

      const start = new Date(
        Date.UTC(year, month - 1, day) - 330 * 60 * 1000
      );

      const end = new Date(
        Date.UTC(year, month - 1, day + 1) - 330 * 60 * 1000
      );

      filter.saleDate = {
        $gte: start,
        $lt: end,
      };
    }

    // Filter by a date range
    if (startDate || endDate) {
      if (
        (startDate && !isValidDate(startDate)) ||
        (endDate && !isValidDate(endDate))
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date. Use YYYY-MM-DD.",
        });
      }

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({
          success: false,
          message: "startDate cannot be after endDate.",
        });
      }

      const range = {};

      if (startDate) {
        const [year, month, day] = startDate.split("-").map(Number);

        range.$gte = new Date(
          Date.UTC(year, month - 1, day) - 330 * 60 * 1000
        );
      }

      if (endDate) {
        const [year, month, day] = endDate.split("-").map(Number);

        range.$lt = new Date(
          Date.UTC(year, month - 1, day + 1) - 330 * 60 * 1000
        );
      }

      filter.saleDate = range;
    }

    // Fetch sales
    const sales = await salesModel
      .find(filter)
      .sort({ saleDate: -1, createdAt: -1 })
      .lean();

    // Calculate summary
    const summary = sales.reduce(
      (acc, sale) => {
        acc.totalSales += Number(sale.totalAmount) || 0;
        acc.amountReceived += Number(sale.amountReceived) || 0;
        acc.remainingBalance += Number(sale.remainingBalance) || 0;
        acc.totalTransactions += 1;

        return acc;
      },
      {
        totalSales: 0,
        amountReceived: 0,
        remainingBalance: 0,
        totalTransactions: 0,
      }
    );

    return res.status(200).json({
      success: true,
      count: sales.length,
      filters: {
        date: date || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      summary,
      sales,
    });
  } catch (error) {
    console.error("Get sales history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales history.",
    });
  }
};

/* 
PUT SALES DATA UPDATE
@ PUT /api/sales/sales-info/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD/update
*/

export const updateSale = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid sale ID.",
    });
  }

  const standaloneChanges = [];
  try {
    const profile = await BusinessProfile.findOne({ key: "default" }).lean();
    const updatedSale = await runInventoryOperation(async (session) => {
      const saleQuery = salesModel.findById(id);
      if (session) saleQuery.session(session);
      const existingSale = await saleQuery;
      if (!existingSale) {
        throw Object.assign(new Error("Sale not found."), { status: 404 });
      }

      const body = req.body ?? {};
      const updates = {};
      EDITABLE_FIELDS.forEach((field) => {
        if (body[field] !== undefined) updates[field] = body[field];
      });

      if (
        isBlank(updates.saleDate) ||
        (typeof updates.saleDate === "string" &&
          updates.saleDate.slice(0, 10) ===
            toISTDateString(existingSale.saleDate))
      ) {
        delete updates.saleDate;
      }

      const oldValue = existingSale.toObject();
      const merged = { ...oldValue, ...updates };
      const targetProductId = isBlank(merged.productId) ? null : merged.productId;
      let product = null;
      if (targetProductId) {
        if (!mongoose.isValidObjectId(targetProductId)) {
          throw Object.assign(new Error("Invalid product selected."), {
            status: 400,
          });
        }
        const query = Product.findById(targetProductId);
        if (session) query.session(session);
        product = await query;
        if (!product || !product.active) {
          throw Object.assign(new Error("Selected product is not available."), {
            status: 404,
          });
        }
      }

      const { error, data } = validateSale(merged, { product, profile });
      if (error) throw Object.assign(new Error(error), { status: 400 });

      const oldProductId = oldValue.productId ? String(oldValue.productId) : null;
      const newProductId = product ? String(product._id) : null;
      const oldQuantity = Number(oldValue.quantity) || 0;
      const newQuantity = Number(data.quantity) || 0;
      const changes = [];

      if (oldProductId && oldProductId === newProductId) {
        const delta = round2(oldQuantity - newQuantity);
        if (delta) {
          changes.push({
            productId: product._id,
            delta,
            type: delta > 0 ? "Sale Return" : "Sale",
            note: `Edited sale for ${data.buyerName}`,
          });
        }
      } else {
        if (oldProductId && oldQuantity > 0) {
          changes.push({
            productId: oldProductId,
            delta: oldQuantity,
            type: "Sale Return",
            note: `Product removed from edited sale ${id}`,
          });
        }
        if (newProductId && newQuantity > 0) {
          changes.push({
            productId: product._id,
            delta: -newQuantity,
            type: "Sale",
            note: `Product added to edited sale ${id}`,
          });
        }
      }

      for (const change of changes) {
        await mutateStock({
          ...change,
          referenceId: existingSale._id,
          session,
        });
        if (!session) standaloneChanges.push(change);
      }

      existingSale.set(data);
      await existingSale.save(session ? { session } : undefined);
      return existingSale;
    });

    return res.status(200).json({
      success: true,
      message: "Sale updated successfully",
      sale: updatedSale,
      data: updatedSale,
    });
  } catch (error) {
    for (const change of standaloneChanges.reverse()) {
      try {
        await rollbackStockMutation({
          ...change,
          type: change.delta > 0 ? "Sale" : "Sale Return",
          note: "Sale stock rollback after failed edit.",
        });
      } catch (rollbackError) {
        console.error("Sale edit stock rollback failed:", rollbackError);
      }
    }
    return handleControllerError(
      res,
      error,
      "Update sale error",
      "Failed to update sale"
    );
  }
};

const toISTDateString = (date) =>
  new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);