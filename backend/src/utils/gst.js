export const GST_RATES = [0, 5, 12, 18, 28];

export const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const isValidGstin = (value) =>
  typeof value === "string" &&
  /^(0[1-9]|[1-2][0-9]|3[0-8]|97)[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
    value.trim().toUpperCase()
  );

export const validateGstin = (value, label = "GSTIN") => {
  if (value && !isValidGstin(value)) {
    return `${label} format is invalid.`;
  }

  return null;
};

const normalizeState = (state) =>
  typeof state === "string" ? state.trim().toLowerCase().replace(/\s+/g, " ") : "";

export const calculateGst = ({
  quantity,
  pricePerUnit,
  discountAmount = 0,
  gstRate = 0,
  priceIncludesGst = false,
  supplierState,
  customerState,
}) => {
  const numericValues = [quantity, pricePerUnit, discountAmount, gstRate].map(Number);

  if (!numericValues.every(Number.isFinite)) {
    return { error: "Enter valid quantity, price, discount and GST rate." };
  }

  const [parsedQuantity, parsedPrice, parsedDiscount, parsedRate] = numericValues;
  if (parsedQuantity <= 0 || parsedPrice < 0 || parsedDiscount < 0) {
    return { error: "Quantity must be positive and price and discount cannot be negative." };
  }

  if (!GST_RATES.includes(parsedRate)) {
    return { error: "GST rate must be 0%, 5%, 12%, 18% or 28%." };
  }

  if (typeof priceIncludesGst !== "boolean") {
    return { error: "Select whether the entered price includes GST." };
  }

  const grossAmount = roundMoney(parsedQuantity * parsedPrice);
  if (parsedDiscount > grossAmount) {
    return { error: "Discount cannot exceed the line amount." };
  }

  const invoiceTotalBeforeRound = grossAmount - parsedDiscount;
  const taxableAmount =
    parsedRate === 0
      ? roundMoney(invoiceTotalBeforeRound)
      : priceIncludesGst
        ? roundMoney(invoiceTotalBeforeRound / (1 + parsedRate / 100))
        : roundMoney(invoiceTotalBeforeRound);
  const totalGst =
    parsedRate === 0
      ? 0
      : priceIncludesGst
        ? roundMoney(invoiceTotalBeforeRound - taxableAmount)
        : roundMoney((taxableAmount * parsedRate) / 100);
  const sameState =
    normalizeState(supplierState) !== "" &&
    normalizeState(supplierState) === normalizeState(customerState);

  if (parsedRate > 0 && (!normalizeState(supplierState) || !normalizeState(customerState))) {
    return {
      error: "Enter both business and customer/supplier state to calculate GST.",
    };
  }

  const cgstAmount = parsedRate > 0 && sameState ? roundMoney(totalGst / 2) : 0;
  const sgstAmount = parsedRate > 0 && sameState ? roundMoney(totalGst - cgstAmount) : 0;
  const igstAmount = parsedRate > 0 && !sameState ? totalGst : 0;
  const invoiceTotal = roundMoney(taxableAmount + totalGst);

  return {
    data: {
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGst,
      invoiceTotal,
      gstRate: parsedRate,
      priceIncludesGst,
      pricingMode: priceIncludesGst ? "inclusive" : "exclusive",
      supplyType: parsedRate === 0 ? "not-applicable" : sameState ? "intra-state" : "inter-state",
    },
  };
};
