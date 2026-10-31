import assert from "node:assert/strict";
import test from "node:test";
import { calculateGst, isValidGstin } from "../src/utils/gst.js";

test("GST-exclusive intra-state pricing splits tax between CGST and SGST", () => {
  const { data } = calculateGst({
    quantity: 100,
    pricePerUnit: 100,
    gstRate: 18,
    supplierState: "Maharashtra",
    customerState: "maharashtra",
    priceIncludesGst: false,
  });

  assert.deepEqual(
    {
      taxableAmount: data.taxableAmount,
      cgstAmount: data.cgstAmount,
      sgstAmount: data.sgstAmount,
      igstAmount: data.igstAmount,
      totalGst: data.totalGst,
      invoiceTotal: data.invoiceTotal,
      supplyType: data.supplyType,
    },
    {
      taxableAmount: 10000,
      cgstAmount: 900,
      sgstAmount: 900,
      igstAmount: 0,
      totalGst: 1800,
      invoiceTotal: 11800,
      supplyType: "intra-state",
    }
  );
});

test("GST-inclusive pricing extracts tax instead of adding it twice", () => {
  const { data } = calculateGst({
    quantity: 1,
    pricePerUnit: 118,
    gstRate: 18,
    supplierState: "Maharashtra",
    customerState: "Maharashtra",
    priceIncludesGst: true,
  });

  assert.equal(data.taxableAmount, 100);
  assert.equal(data.totalGst, 18);
  assert.equal(data.invoiceTotal, 118);
});

test("inter-state sales use IGST only", () => {
  const { data } = calculateGst({
    quantity: 100,
    pricePerUnit: 100,
    gstRate: 18,
    supplierState: "Maharashtra",
    customerState: "Gujarat",
    priceIncludesGst: false,
  });

  assert.equal(data.igstAmount, 1800);
  assert.equal(data.cgstAmount, 0);
  assert.equal(data.sgstAmount, 0);
});

test("zero-rated entries do not require state details", () => {
  const { data } = calculateGst({
    quantity: 2,
    pricePerUnit: 50,
    gstRate: 0,
    priceIncludesGst: false,
  });

  assert.equal(data.totalGst, 0);
  assert.equal(data.invoiceTotal, 100);
});

test("GST calculation rounds money and applies discount before tax", () => {
  const { data } = calculateGst({
    quantity: 1,
    pricePerUnit: 10,
    discountAmount: 1,
    gstRate: 5,
    supplierState: "Delhi",
    customerState: "Delhi",
    priceIncludesGst: false,
  });

  assert.equal(data.taxableAmount, 9);
  assert.equal(data.totalGst, 0.45);
  assert.equal(data.invoiceTotal, 9.45);
});

test("rejects unsupported GST rates and malformed GSTINs", () => {
  const result = calculateGst({
    quantity: 1,
    pricePerUnit: 10,
    gstRate: 7,
    priceIncludesGst: false,
  });

  assert.match(result.error, /GST rate/);
  assert.equal(isValidGstin("27AAPFU0939F1ZV"), true);
  assert.equal(isValidGstin("invalid"), false);
});
