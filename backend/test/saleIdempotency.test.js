import test from "node:test";
import assert from "node:assert/strict";
import {
  hashSaleRequest,
  isValidSaleIdempotencyKey,
} from "../src/service/saleIdempotency.service.js";

test("sale idempotency keys must be present and bounded", () => {
  assert.equal(isValidSaleIdempotencyKey("sale-request-123"), true);
  assert.equal(isValidSaleIdempotencyKey("short"), false);
  assert.equal(isValidSaleIdempotencyKey(""), false);
  assert.equal(isValidSaleIdempotencyKey("x".repeat(129)), false);
  assert.equal(isValidSaleIdempotencyKey(123), false);
});

test("sale request hashing ignores object key order but detects changed details", () => {
  assert.equal(
    hashSaleRequest({ buyerName: "Rahul", product: { id: "1", quantity: 2 } }),
    hashSaleRequest({ product: { quantity: 2, id: "1" }, buyerName: "Rahul" })
  );
  assert.notEqual(
    hashSaleRequest({ buyerName: "Rahul", quantity: 39 }),
    hashSaleRequest({ buyerName: "Rahul", quantity: 40 })
  );
});
