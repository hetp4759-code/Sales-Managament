import { isValidObjectId } from "./inventory.service.js";
import { validateGstin } from "../utils/gst.js";

const editableFields = new Set([
  "supplierName",
  "supplierGstin",
  "supplierState",
  "invoiceNumber",
  "purchaseDate",
  "productId",
  "quantity",
  "pricePerUnit",
  "discountAmount",
  "gstRate",
  "priceIncludesGst",
  "notes",
]);

const numericFields = new Set([
  "quantity",
  "pricePerUnit",
  "discountAmount",
  "gstRate",
]);

const stringFields = new Set([
  "supplierName",
  "supplierGstin",
  "supplierState",
  "invoiceNumber",
  "notes",
]);

export const validatePurchaseUpdate = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Enter valid purchase details." };
  }

  const keys = Object.keys(input);
  if (!keys.length) return { error: "Provide at least one purchase field to update." };

  const unsupportedField = keys.find((key) => !editableFields.has(key));
  if (unsupportedField) {
    return { error: `The "${unsupportedField}" field cannot be updated here.` };
  }

  const updates = {};
  for (const key of keys) {
    const value = input[key];

    if (stringFields.has(key)) {
      if (typeof value !== "string") {
        return { error: `Enter a valid ${key}.` };
      }
      const cleanValue = value.trim();
      if ((key === "supplierName" || key === "supplierState") && !cleanValue) {
        return { error: `${key === "supplierName" ? "Supplier name" : "Supplier state"} is required.` };
      }
      updates[key] = cleanValue;
      continue;
    }

    if (numericFields.has(key)) {
      if (
        (typeof value !== "number" &&
          (typeof value !== "string" || !value.trim())) ||
        !Number.isFinite(Number(value))
      ) {
        return { error: `Enter a valid ${key}.` };
      }
      const number = Number(value);
      if (
        (key === "quantity" && number <= 0) ||
        (key !== "quantity" && number < 0)
      ) {
        return {
          error:
            key === "quantity"
              ? "Quantity must be greater than zero."
              : `${key} cannot be negative.`,
        };
      }
      updates[key] = number;
      continue;
    }

    if (key === "purchaseDate") {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
        return { error: "Enter a valid purchase date." };
      }
      const [year, month, day] = value.slice(0, 10).split("-").map(Number);
      const calendarDate = new Date(Date.UTC(year, month - 1, day));
      const date = new Date(value);
      if (
        Number.isNaN(date.getTime()) ||
        calendarDate.getUTCFullYear() !== year ||
        calendarDate.getUTCMonth() !== month - 1 ||
        calendarDate.getUTCDate() !== day
      ) {
        return { error: "Enter a valid purchase date." };
      }
      updates.purchaseDate = date;
      continue;
    }

    if (key === "productId") {
      if (typeof value !== "string" || !isValidObjectId(value)) {
        return { error: "Select a valid product." };
      }
      updates.productId = value;
      continue;
    }

    if (key === "priceIncludesGst") {
      if (typeof value !== "boolean") {
        return { error: "Select whether the price includes GST." };
      }
      updates.priceIncludesGst = value;
    }
  }

  const gstinError = validateGstin(updates.supplierGstin, "Supplier GSTIN");
  if (gstinError) return { error: gstinError };

  return { updates };
};

export const getPurchaseStockAdjustments = ({
  oldProductId,
  newProductId,
  oldQuantity,
  newQuantity,
}) => {
  if (String(oldProductId) === String(newProductId)) {
    const delta = newQuantity - oldQuantity;
    return delta === 0 ? [] : [{ productId: newProductId, delta }];
  }

  return [
    { productId: oldProductId, delta: -oldQuantity },
    { productId: newProductId, delta: newQuantity },
  ];
};
