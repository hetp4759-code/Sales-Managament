import test from "node:test";
import assert from "node:assert/strict";
import {
  getPurchaseStockAdjustments,
  validatePurchaseUpdate,
} from "../src/service/purchaseUpdate.service.js";

test("purchase update accepts partial supplier changes", () => {
  assert.deepEqual(validatePurchaseUpdate({ supplierName: "  New Supplier " }), {
    updates: { supplierName: "New Supplier" },
  });
});

test("purchase update rejects unsupported fields and invalid values", () => {
  assert.match(validatePurchaseUpdate({ amountPaid: 10 }).error, /cannot be updated/);
  assert.match(validatePurchaseUpdate({ quantity: 0 }).error, /greater than zero/);
  assert.match(validatePurchaseUpdate({ pricePerUnit: -1 }).error, /cannot be negative/);
  assert.match(validatePurchaseUpdate({ supplierName: " " }).error, /required/);
});

test("purchase update validates product IDs and purchase dates", () => {
  assert.match(validatePurchaseUpdate({ productId: "invalid" }).error, /valid product/);
  assert.match(validatePurchaseUpdate({ purchaseDate: "2026-02-31" }).error, /valid purchase date/);
});

test("stock corrections are incremental for the same product", () => {
  assert.deepEqual(
    getPurchaseStockAdjustments({
      oldProductId: "product-a",
      newProductId: "product-a",
      oldQuantity: 4,
      newQuantity: 7,
    }),
    [{ productId: "product-a", delta: 3 }]
  );
});

test("stock corrections reverse the old product and receive the new product", () => {
  assert.deepEqual(
    getPurchaseStockAdjustments({
      oldProductId: "product-a",
      newProductId: "product-b",
      oldQuantity: 4,
      newQuantity: 7,
    }),
    [
      { productId: "product-a", delta: -4 },
      { productId: "product-b", delta: 7 },
    ]
  );
});
