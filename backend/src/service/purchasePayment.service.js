import { roundMoney } from "../utils/gst.js";

export const PAYMENT_METHODS = ["Cash", "UPI", "Bank Transfer", "Card", "Other"];

const isValidDate = (value) => {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value.trim())
  ) {
    return false;
  }
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export const validatePurchasePayment = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Enter valid payment details." };
  }

  const allowedFields = new Set([
    "amount",
    "paymentMethod",
    "paymentDate",
    "reference",
    "idempotencyKey",
  ]);
  const unsupportedField = Object.keys(input).find(
    (field) => !allowedFields.has(field)
  );
  if (unsupportedField) {
    return { error: `The "${unsupportedField}" field is not supported.` };
  }

  const amountValue = input.amount;
  const amountString =
    typeof amountValue === "string" ? amountValue.trim() : String(amountValue);
  if (
    (typeof amountValue !== "number" && typeof amountValue !== "string") ||
    !/^\d+(?:\.\d{1,2})?$/.test(amountString) ||
    !Number.isFinite(Number(amountString)) ||
    Number(amountString) <= 0 ||
    !Number.isSafeInteger(Math.round(Number(amountString) * 100))
  ) {
    return { error: "Payment amount must be a valid number greater than zero, with at most two decimal places." };
  }

  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    return { error: "Select a valid payment method." };
  }

  if (
    input.paymentDate !== undefined &&
    (typeof input.paymentDate !== "string" || !isValidDate(input.paymentDate))
  ) {
    return { error: "Enter a valid payment date." };
  }

  if (
    input.reference !== undefined &&
    (typeof input.reference !== "string" || input.reference.trim().length > 200)
  ) {
    return { error: "Payment reference must be 200 characters or fewer." };
  }

  if (
    typeof input.idempotencyKey !== "string" ||
    !/^[A-Za-z0-9._:-]{8,128}$/.test(input.idempotencyKey)
  ) {
    return { error: "A valid payment request key is required." };
  }

  return {
    payment: {
      amount: roundMoney(Number(amountString)),
      paymentMethod: input.paymentMethod,
      paymentDate:
        input.paymentDate === undefined
          ? new Date()
          : new Date(input.paymentDate),
      reference: input.reference?.trim() || "",
      idempotencyKey: input.idempotencyKey,
    },
  };
};

export const getPaymentAmounts = (total, paid) => {
  const invoiceTotal = roundMoney(total);
  const amountPaid = roundMoney(paid);
  const outstandingPayable = roundMoney(invoiceTotal - amountPaid);

  return {
    amountPaid,
    outstandingPayable,
    paymentStatus:
      outstandingPayable === 0
        ? "Paid"
        : amountPaid > 0
          ? "Partial"
          : "Pending",
  };
};

export const paymentExceedsBalance = (total, paid, amount) =>
  Math.round(roundMoney(amount) * 100) >
  Math.round(getPaymentAmounts(total, paid).outstandingPayable * 100);

export const matchesExistingPayment = (existing, payment, paymentDateProvided) =>
  Math.round(Number(existing.amount) * 100) ===
    Math.round(payment.amount * 100) &&
  existing.paymentMethod === payment.paymentMethod &&
  (existing.reference || "") === payment.reference &&
  (!paymentDateProvided ||
    new Date(existing.paymentDate).getTime() === payment.paymentDate.getTime());
