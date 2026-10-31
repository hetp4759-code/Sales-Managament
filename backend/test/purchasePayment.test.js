import test from "node:test";
import assert from "node:assert/strict";
import {
  getPaymentAmounts,
  matchesExistingPayment,
  paymentExceedsBalance,
  validatePurchasePayment,
} from "../src/service/purchasePayment.service.js";

const validPayment = {
  amount: 300,
  paymentMethod: "UPI",
  paymentDate: "2026-10-30T12:00:00.000Z",
  reference: "Transfer 123",
  idempotencyKey: "request-key-123456",
};

test("valid payment input is normalized and preserved", () => {
  const result = validatePurchasePayment(validPayment);
  assert.equal(result.error, undefined);
  assert.equal(result.payment.amount, 300);
  assert.equal(result.payment.paymentMethod, "UPI");
  assert.equal(result.payment.reference, "Transfer 123");
});

test("payment validation rejects invalid amounts, methods, dates and fields", () => {
  for (const amount of [0, -1, "abc", "1.001", ""]) {
    assert.ok(validatePurchasePayment({ ...validPayment, amount }).error);
  }
  assert.match(
    validatePurchasePayment({ ...validPayment, paymentMethod: "Cheque" }).error,
    /payment method/
  );
  assert.match(
    validatePurchasePayment({ ...validPayment, paymentDate: "2026-02-31" }).error,
    /payment date/
  );
  assert.match(
    validatePurchasePayment({ ...validPayment, amountPaid: 300 }).error,
    /not supported/
  );
  assert.match(
    validatePurchasePayment({ ...validPayment, idempotencyKey: "short" }).error,
    /request key/
  );
});

test("payment balances derive Pending, Partial and Paid without changing receipt status", () => {
  assert.deepEqual(getPaymentAmounts(1000, 0), {
    amountPaid: 0,
    outstandingPayable: 1000,
    paymentStatus: "Pending",
  });
  assert.deepEqual(getPaymentAmounts(1000, 700), {
    amountPaid: 700,
    outstandingPayable: 300,
    paymentStatus: "Partial",
  });
  assert.deepEqual(getPaymentAmounts(1000, 1000), {
    amountPaid: 1000,
    outstandingPayable: 0,
    paymentStatus: "Paid",
  });
});

test("payment amounts cannot exceed the remaining balance", () => {
  assert.equal(paymentExceedsBalance(1000, 700, 300), false);
  assert.equal(paymentExceedsBalance(1000, 700, 300.01), true);
});

test("idempotent retry matches the original payment details", () => {
  const parsed = validatePurchasePayment(validPayment).payment;
  const existing = {
    amount: 300,
    paymentMethod: "UPI",
    paymentDate: new Date(validPayment.paymentDate),
    reference: "Transfer 123",
  };
  assert.equal(matchesExistingPayment(existing, parsed, true), true);
  assert.equal(
    matchesExistingPayment(existing, { ...parsed, amount: 301 }, true),
    false
  );
});
