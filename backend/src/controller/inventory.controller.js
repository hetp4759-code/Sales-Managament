import mongoose from "mongoose";
import BusinessProfile from "../model/businessProfile.model.js";
import Product from "../model/product.model.js";
import StockMovement from "../model/stockMovement.model.js";
import { GST_RATES, validateGstin } from "../utils/gst.js";
import {
  isValidObjectId,
  mutateStock,
  runInventoryOperation,
} from "../service/inventory.service.js";

const PRODUCT_FIELDS = [
  "name",
  "sku",
  "hsnCode",
  "unit",
  "gstRate",
  "purchasePrice",
  "sellingPrice",
  "minimumStock",
  "description",
  "active",
];
const UNITS = ["Kg", "Litre", "Gram", "Packet", "Piece"];
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const sendError = (res, error, fallback) => {
  console.error(fallback, error);
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A product with this SKU already exists.",
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : fallback,
  });
};

const sendBusinessProfileError = (res, error, fallback) => {
  console.error(fallback, error);
  return res.status(error.code === 11000 ? 409 : error.status || 500).json({
    success: false,
    message:
      error.code === 11000
        ? "Business profile setup conflicted with another update. Please retry."
        : error.status
          ? error.message
          : fallback,
  });
};

export const getBusinessProfile = async (_req, res) => {
  try {
    const profile = await BusinessProfile.findOneAndUpdate(
      { key: "default" },
      { $setOnInsert: { key: "default", setupCompleted: false } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, profile });
  } catch (error) {
    return sendBusinessProfileError(res, error, "Unable to load business profile.");
  }
};

const BUSINESS_PROFILE_FIELDS = [
  "name",
  "businessType",
  "address",
  "city",
  "state",
  "pincode",
  "phone",
  "email",
  "hasGstRegistration",
  "gstin",
  "gstRegistrationType",
];
const BUSINESS_TYPES = [
  "Retailer",
  "Wholesaler",
  "Manufacturer",
  "Distributor",
  "Service Provider",
  "Other",
];
const GST_REGISTRATION_TYPES = ["Regular", "Composition", "Other"];
const REQUIRED_BUSINESS_FIELDS = [
  "name",
  "businessType",
  "address",
  "city",
  "state",
  "pincode",
];
const PINCODE_PATTERN = /^[1-9]\d{5}$/;
const PHONE_PATTERN = /^(?:\+91[ -]?)?[6-9]\d{9}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateBusinessProfileUpdate = (input, existingProfile) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Business profile data must be an object." };
  }

  const unknownFields = Object.keys(input).filter(
    (field) => !BUSINESS_PROFILE_FIELDS.includes(field)
  );
  if (unknownFields.length) {
    return { error: `Unsupported business profile field: ${unknownFields[0]}.` };
  }

  const updates = {};
  for (const [field, value] of Object.entries(input)) {
    if (field === "hasGstRegistration") {
      if (typeof value !== "boolean") {
        return { error: "Select whether the business is GST-registered." };
      }
      updates[field] = value;
      continue;
    }

    if (typeof value !== "string") {
      return { error: `${field} must be text.` };
    }
    const normalized = value.trim();
    if (["name", "businessType", "address", "city", "state", "pincode"].includes(field) && !normalized) {
      return { error: `${field} is required.` };
    }

    if (field === "businessType" && !BUSINESS_TYPES.includes(normalized)) {
      return { error: "Select a valid business type." };
    }
    if (field === "pincode" && !PINCODE_PATTERN.test(normalized)) {
      return { error: "Enter a valid 6-digit Indian PIN code." };
    }
    if (field === "phone" && normalized && !PHONE_PATTERN.test(normalized)) {
      return { error: "Enter a valid Indian phone number." };
    }
    if (field === "email" && normalized && !EMAIL_PATTERN.test(normalized)) {
      return { error: "Enter a valid business email address." };
    }
    if (
      field === "gstRegistrationType" &&
      normalized &&
      !GST_REGISTRATION_TYPES.includes(normalized)
    ) {
      return { error: "Select a valid GST registration type." };
    }

    updates[field] =
      field === "gstin" ? normalized.toUpperCase() :
        field === "email" ? normalized.toLowerCase() : normalized;
  }

  const mergedProfile = { ...existingProfile, ...updates };
  if (updates.gstin) {
    const gstinError = validateGstin(updates.gstin, "Business GSTIN");
    if (gstinError) return { error: gstinError };
  }
  if (mergedProfile.hasGstRegistration === false) {
    if (updates.gstin && updates.gstin.length) {
      return { error: "GSTIN cannot be provided when GST registration is No." };
    }
    if (updates.gstRegistrationType) {
      return {
        error: "GST registration type cannot be set when GST registration is No.",
      };
    }
    if (updates.hasGstRegistration === false) {
      updates.gstin = "";
      updates.gstRegistrationType = "";
      mergedProfile.gstin = "";
      mergedProfile.gstRegistrationType = "";
    }
  } else if (mergedProfile.hasGstRegistration === true) {
    const gstinError = validateGstin(mergedProfile.gstin, "Business GSTIN");
    if (gstinError) return { error: gstinError };
    if (!mergedProfile.gstin) {
      return { error: "Business GSTIN is required for GST-registered businesses." };
    }
  }

  const complete =
    REQUIRED_BUSINESS_FIELDS.every(
      (field) =>
        typeof mergedProfile[field] === "string" &&
        mergedProfile[field].trim().length > 0
    ) &&
    PINCODE_PATTERN.test(mergedProfile.pincode || "") &&
    typeof mergedProfile.hasGstRegistration === "boolean" &&
    (!mergedProfile.hasGstRegistration ||
      Boolean(mergedProfile.gstin && !validateGstin(mergedProfile.gstin)));

  return { updates, setupCompleted: complete };
};

const saveBusinessProfile = async (req, res, input) => {
  try {
    const existingProfile = await BusinessProfile.findOne({ key: "default" }).lean();
    const validation = validateBusinessProfileUpdate(
      input,
      existingProfile || {}
    );
    if (validation.error) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    const profile = await BusinessProfile.findOneAndUpdate(
      { key: "default" },
      {
        $set: {
          ...validation.updates,
          setupCompleted: validation.setupCompleted,
        },
        $setOnInsert: { key: "default" },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      message: "Business profile saved.",
      profile,
    });
  } catch (error) {
    return sendBusinessProfileError(res, error, "Unable to save business profile.");
  }
};

export const patchBusinessProfile = async (req, res) =>
  saveBusinessProfile(req, res, req.body);

export const updateBusinessProfile = async (req, res) => {
  const legacyFields = ["name", "address", "state", "gstin"];
  const input = {};
  for (const field of legacyFields) {
    if (req.body?.[field] !== undefined) input[field] = req.body[field];
  }
  return saveBusinessProfile(req, res, input);
};

export const getProducts = async (req, res) => {
  try {
    const filter = {};
    if (req.query.includeInactive !== "true") filter.active = true;
    if (typeof req.query.search === "string" && req.query.search.trim()) {
      const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 }).lean();
    return res.json({ success: true, products });
  } catch (error) {
    return sendError(res, error, "Unable to fetch products.");
  }
};

export const createProduct = async (req, res) => {
  const input = req.body ?? {};
  const numbers = ["gstRate", "purchasePrice", "sellingPrice", "stock", "minimumStock"];
  for (const field of numbers) {
    if (input[field] !== undefined && !Number.isFinite(Number(input[field]))) {
      return res.status(400).json({
        success: false,
        message: `Enter a valid ${field}.`,
      });
    }
  }

  if (typeof input.name !== "string" || !input.name.trim()) {
    return res.status(400).json({ success: false, message: "Product name is required." });
  }
  if (input.unit !== undefined && !UNITS.includes(input.unit)) {
    return res.status(400).json({ success: false, message: "Invalid product unit." });
  }
  if (input.gstRate !== undefined && !GST_RATES.includes(Number(input.gstRate))) {
    return res.status(400).json({ success: false, message: "Invalid GST rate." });
  }
  if (
    numbers.some((field) => Number(input[field] ?? 0) < 0) ||
    (input.stock !== undefined && Number(input.stock) < 0)
  ) {
    return res.status(400).json({ success: false, message: "Product amounts and stock cannot be negative." });
  }

  try {
    const openingStock = Number(input.stock ?? 0);
    const productData = { name: input.name.trim(), stock: 0 };
    PRODUCT_FIELDS.forEach((field) => {
      if (input[field] !== undefined) productData[field] = input[field];
    });
    productData.gstRate = Number(productData.gstRate ?? 0);
    productData.purchasePrice = round2(productData.purchasePrice ?? 0);
    productData.sellingPrice = round2(productData.sellingPrice ?? 0);
    productData.minimumStock = Number(productData.minimumStock ?? 0);
    productData.sku = (productData.sku || "").trim().toUpperCase();

    const product = await runInventoryOperation(async (session) => {
      const [created] = await Product.create(
        [productData],
        session ? { session } : undefined
      );
      if (openingStock > 0) {
        try {
          await mutateStock({
            productId: created._id,
            delta: openingStock,
            type: "Opening Stock",
            note: "Initial stock entered when creating product.",
            session,
          });
          created.stock = openingStock;
        } catch (error) {
          if (!session) await Product.deleteOne({ _id: created._id });
          throw error;
        }
      }
      return created;
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    return sendError(res, error, "Unable to create product.");
  }
};

export const updateProduct = async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json({ success: false, message: "Invalid product ID." });
  }

  const updates = {};
  PRODUCT_FIELDS.forEach((field) => {
    if (req.body?.[field] !== undefined) updates[field] = req.body[field];
  });
  if (updates.name !== undefined && (typeof updates.name !== "string" || !updates.name.trim())) {
    return res.status(400).json({ success: false, message: "Product name is required." });
  }
  if (updates.unit !== undefined && !UNITS.includes(updates.unit)) {
    return res.status(400).json({ success: false, message: "Invalid product unit." });
  }
  if (updates.gstRate !== undefined && !GST_RATES.includes(Number(updates.gstRate))) {
    return res.status(400).json({ success: false, message: "Invalid GST rate." });
  }
  if (
    ["purchasePrice", "sellingPrice", "minimumStock"].some(
      (field) =>
        updates[field] !== undefined &&
        (!Number.isFinite(Number(updates[field])) || Number(updates[field]) < 0)
    )
  ) {
    return res.status(400).json({ success: false, message: "Product prices and minimum stock must be non-negative numbers." });
  }

  try {
    if (updates.name) updates.name = updates.name.trim();
    if (updates.sku !== undefined) updates.sku = updates.sku.trim().toUpperCase();
    if (updates.gstRate !== undefined) updates.gstRate = Number(updates.gstRate);
    for (const field of ["purchasePrice", "sellingPrice"]) {
      if (updates[field] !== undefined) updates[field] = round2(updates[field]);
    }
    if (updates.minimumStock !== undefined) updates.minimumStock = Number(updates.minimumStock);

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    return res.json({ success: true, product });
  } catch (error) {
    return sendError(res, error, "Unable to update product.");
  }
};

export const adjustProductStock = async (req, res) => {
  const { quantity, note } = req.body ?? {};
  const delta = Number(quantity);
  if (
    !isValidObjectId(req.params.id) ||
    !Number.isFinite(delta) ||
    delta === 0 ||
    (note !== undefined && typeof note !== "string")
  ) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid product, non-zero stock change and optional note.",
    });
  }

  try {
    const { product, movement } = await mutateStock({
      productId: req.params.id,
      delta,
      type: "Manual Adjustment",
      note: (note || "").trim(),
    });
    return res.json({ success: true, product, movement });
  } catch (error) {
    return sendError(res, error, "Unable to adjust product stock.");
  }
};

export const getStockMovements = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
    const filter = {};
    if (req.query.productId) {
      if (!mongoose.isValidObjectId(req.query.productId)) {
        return res.status(400).json({ success: false, message: "Invalid product ID." });
      }
      filter.productId = req.query.productId;
    }

    const movements = await StockMovement.find(filter)
      .populate("productId", "name sku unit")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ success: true, movements });
  } catch (error) {
    return sendError(res, error, "Unable to fetch stock movements.");
  }
};
