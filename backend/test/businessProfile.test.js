import test from "node:test";
import assert from "node:assert/strict";
import { validateBusinessProfileUpdate } from "../src/controller/inventory.controller.js";

const completedProfile = {
  name: "Patel Enterprise",
  businessType: "Retailer",
  address: "12 Market Road",
  city: "Ahmedabad",
  state: "Gujarat",
  pincode: "380001",
  phone: "",
  email: "",
  hasGstRegistration: false,
  gstin: "",
  gstRegistrationType: "",
  setupCompleted: true,
};

test("business profile PATCH validates and updates only the supplied name", () => {
  const result = validateBusinessProfileUpdate(
    { name: "  Patel Enterprise West  " },
    completedProfile
  );

  assert.deepEqual(result, {
    updates: { name: "Patel Enterprise West" },
    setupCompleted: true,
  });
});

test("business profile PATCH validates and updates only the supplied address", () => {
  const result = validateBusinessProfileUpdate(
    { address: "  15 River Road  " },
    completedProfile
  );

  assert.deepEqual(result, {
    updates: { address: "15 River Road" },
    setupCompleted: true,
  });
});

test("business profile remains incomplete until all required fields are present", () => {
  const result = validateBusinessProfileUpdate(
    { name: "Patel Enterprise" },
    {}
  );

  assert.equal(result.error, undefined);
  assert.equal(result.setupCompleted, false);
  assert.deepEqual(result.updates, { name: "Patel Enterprise" });
});

test("GST registration requires a valid GSTIN", () => {
  const missingGstin = validateBusinessProfileUpdate(
    { hasGstRegistration: true },
    completedProfile
  );
  const invalidGstin = validateBusinessProfileUpdate(
    { hasGstRegistration: true, gstin: "not-a-gstin" },
    completedProfile
  );

  assert.match(missingGstin.error, /GSTIN is required/);
  assert.match(invalidGstin.error, /format is invalid/);
});

test("business profile PATCH rejects protected and unknown fields", () => {
  const result = validateBusinessProfileUpdate(
    { setupCompleted: true },
    completedProfile
  );

  assert.match(result.error, /Unsupported business profile field/);
});
