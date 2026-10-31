import { createHash } from "node:crypto";

const sortKeys = (value) => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])])
  );
};

export const isValidSaleIdempotencyKey = (value) =>
  typeof value === "string" &&
  /^[A-Za-z0-9._:-]{8,128}$/.test(value);

export const hashSaleRequest = (input) =>
  createHash("sha256")
    .update(JSON.stringify(sortKeys(input)))
    .digest("hex");
