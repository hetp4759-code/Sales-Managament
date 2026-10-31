import mongoose from "mongoose";

const businessProfileSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    name: { type: String, trim: true, default: "" },
    businessType: {
      type: String,
      enum: ["", "Retailer", "Wholesaler", "Manufacturer", "Distributor", "Service Provider", "Other"],
      default: "",
    },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    hasGstRegistration: { type: Boolean, default: null },
    gstin: { type: String, trim: true, uppercase: true, default: "" },
    gstRegistrationType: {
      type: String,
      enum: ["", "Regular", "Composition", "Other"],
      default: "",
    },
    setupCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const BusinessProfile = mongoose.model("BusinessProfile", businessProfileSchema);

export default BusinessProfile;
