import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hook/useAuth";
import inventoryService from "../service/inventoryService";

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];
const BUSINESS_TYPES = [
  "Retailer",
  "Wholesaler",
  "Manufacturer",
  "Distributor",
  "Service Provider",
  "Other",
];
const REGISTRATION_TYPES = ["Regular", "Composition", "Other"];
const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";
const fieldClass = (error) =>
  `${inputClass} ${error ? "border-red-400 focus:border-red-500 focus:ring-red-500/10" : ""}`;
const labelClass = "block text-sm font-medium text-slate-700";

const formFromProfile = (profile) => ({
  name: profile?.name || "",
  businessType: profile?.businessType || "",
  address: profile?.address || "",
  city: profile?.city || "",
  state: profile?.state || "",
  pincode: profile?.pincode || "",
  phone: profile?.phone || "",
  email: profile?.email || "",
  hasGstRegistration:
    typeof profile?.hasGstRegistration === "boolean"
      ? String(profile.hasGstRegistration)
      : "",
  gstin: profile?.gstin || "",
  gstRegistrationType: profile?.gstRegistrationType || "",
});

const TextField = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  type = "text",
  autoComplete,
  placeholder,
  maxLength,
  inputMode,
}) => (
  <label className={labelClass} htmlFor={`business-${name}`}>
    {label}
    {required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
    <input
      id={`business-${name}`}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      autoComplete={autoComplete}
      placeholder={placeholder}
      maxLength={maxLength}
      inputMode={inputMode}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `business-${name}-error` : undefined}
      className={fieldClass(error)}
    />
    {error && (
      <span id={`business-${name}-error`} className="mt-1 block text-xs text-red-600">
        {error}
      </span>
    )}
  </label>
);

const SelectField = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
  placeholder = "Select an option",
}) => (
  <label className={labelClass} htmlFor={`business-${name}`}>
    {label}
    {required && <span className="ml-1 text-red-600" aria-hidden="true">*</span>}
    <select
      id={`business-${name}`}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `business-${name}-error` : undefined}
      className={fieldClass(error)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
    {error && (
      <span id={`business-${name}-error`} className="mt-1 block text-xs text-red-600">
        {error}
      </span>
    )}
  </label>
);

const BusinessSettings = () => {
  const navigate = useNavigate();
  const {
    businessProfile,
    businessProfileLoading,
    businessProfileError,
    retryBusinessProfile,
    refreshBusinessProfile,
  } = useAuth();
  const [profile, setProfile] = useState(() => formFromProfile(businessProfile));
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (businessProfile) setProfile(formFromProfile(businessProfile));
  }, [businessProfile]);

  const isSetup = !businessProfile?.setupCompleted;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    setError("");
    setSuccess("");
  };

  const validate = () => {
    const errors = {};
    for (const [field, label] of [
      ["name", "Business name"],
      ["businessType", "Business type"],
      ["address", "Business address"],
      ["city", "City"],
      ["state", "State"],
      ["pincode", "PIN code"],
    ]) {
      if (!profile[field].trim()) errors[field] = `${label} is required.`;
    }

    if (profile.pincode && !/^[1-9]\d{5}$/.test(profile.pincode.trim())) {
      errors.pincode = "Enter a valid 6-digit Indian PIN code.";
    }
    if (
      profile.phone.trim() &&
      !/^(?:\+91[ -]?)?[6-9]\d{9}$/.test(profile.phone.trim())
    ) {
      errors.phone = "Enter a valid Indian phone number.";
    }
    if (
      profile.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())
    ) {
      errors.email = "Enter a valid business email address.";
    }
    if (!profile.hasGstRegistration) {
      errors.hasGstRegistration = "Select Yes or No for GST registration.";
    } else if (
      profile.hasGstRegistration === "true" &&
      !profile.gstin.trim()
    ) {
      errors.gstin = "GSTIN is required for GST-registered businesses.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (saving || !validate()) return;

    setSaving(true);
    try {
      const { profile: saved } = await inventoryService.saveBusinessProfile({
        ...profile,
        name: profile.name.trim(),
        address: profile.address.trim(),
        city: profile.city.trim(),
        state: profile.state.trim(),
        pincode: profile.pincode.trim(),
        phone: profile.phone.trim(),
        email: profile.email.trim().toLowerCase(),
        hasGstRegistration: profile.hasGstRegistration === "true",
        gstin:
          profile.hasGstRegistration === "true"
            ? profile.gstin.trim().toUpperCase()
            : "",
        gstRegistrationType:
          profile.hasGstRegistration === "true"
            ? profile.gstRegistrationType
            : "",
      });

      const confirmed = await refreshBusinessProfile();
      if (!confirmed) {
        setError("Details were saved, but setup status could not be verified. Please retry.");
        return;
      }

      setProfile(formFromProfile(saved));
      if (isSetup && confirmed.setupCompleted) {
        navigate("/dashboard", { replace: true });
        return;
      }
      if (!confirmed.setupCompleted) {
        setError("Complete all required business details before continuing.");
        return;
      }
      setSuccess("Business details saved.");
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "Unable to save business details. Please try again.";
      setError(message);
      if (message.toLowerCase().includes("gstin")) {
        setFieldErrors((previous) => ({ ...previous, gstin: message }));
      } else if (message.toLowerCase().includes("pincode")) {
        setFieldErrors((previous) => ({ ...previous, pincode: message }));
      } else if (message.toLowerCase().includes("phone")) {
        setFieldErrors((previous) => ({ ...previous, phone: message }));
      } else if (message.toLowerCase().includes("email")) {
        setFieldErrors((previous) => ({ ...previous, email: message }));
      }
    } finally {
      setSaving(false);
    }
  };

  const serverError = businessProfileError || error;

  return (
    <main className="min-h-screen min-w-0 w-full bg-slate-50 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="min-w-0 w-full">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {isSetup ? "Set up your business" : "Business details"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isSetup
                ? "Complete your business profile before using SalesManager."
                : "Manage the business details used on sales and GST records."}
            </p>
          </div>
          {!isSetup && (
            <Link
              to="/dashboard"
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              Back to Dashboard
            </Link>
          )}
        </header>

        {businessProfileLoading && (
          <p role="status" className="mb-4 rounded-xl bg-white p-4 text-sm text-slate-600">
            Checking saved business details...
          </p>
        )}
        {serverError && (
          <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{serverError}</span>
            {businessProfileError && (
              <button
                type="button"
                onClick={retryBusinessProfile}
                className="rounded-lg border border-red-300 px-3 py-1.5 font-semibold hover:bg-red-100"
              >
                Retry
              </button>
            )}
          </div>
        )}
        {success && (
          <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={saving}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8"
        >
          <section aria-labelledby="basic-details-title">
            <h2 id="basic-details-title" className="text-base font-semibold text-slate-900">
              Basic business details
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <TextField label="Business name" name="name" value={profile.name} onChange={handleChange} error={fieldErrors.name} required autoComplete="organization" />
              <SelectField label="Business type" name="businessType" value={profile.businessType} onChange={handleChange} options={BUSINESS_TYPES} error={fieldErrors.businessType} required />
              <label className={`${labelClass} md:col-span-2`} htmlFor="business-address">
                Business address<span className="ml-1 text-red-600" aria-hidden="true">*</span>
                <textarea
                  id="business-address"
                  name="address"
                  rows={3}
                  value={profile.address}
                  onChange={handleChange}
                  required
                  aria-invalid={Boolean(fieldErrors.address)}
                  aria-describedby={fieldErrors.address ? "business-address-error" : undefined}
                  className={`${fieldClass(fieldErrors.address)} resize-y`}
                />
                {fieldErrors.address && <span id="business-address-error" className="mt-1 block text-xs text-red-600">{fieldErrors.address}</span>}
              </label>
              <TextField label="City" name="city" value={profile.city} onChange={handleChange} error={fieldErrors.city} required autoComplete="address-level2" />
              <SelectField label="State / Union Territory" name="state" value={profile.state} onChange={handleChange} options={STATES} error={fieldErrors.state} required placeholder="Select state" />
              <TextField label="PIN code" name="pincode" value={profile.pincode} onChange={handleChange} error={fieldErrors.pincode} required inputMode="numeric" maxLength={6} autoComplete="postal-code" />
              <TextField label="Business phone (optional)" name="phone" value={profile.phone} onChange={handleChange} error={fieldErrors.phone} type="tel" autoComplete="tel" placeholder="+91 9876543210" />
              <TextField label="Business email (optional)" name="email" value={profile.email} onChange={handleChange} error={fieldErrors.email} type="email" autoComplete="email" />
            </div>
          </section>

          <section aria-labelledby="gst-details-title" className="border-t border-slate-100 pt-6">
            <h2 id="gst-details-title" className="text-base font-semibold text-slate-900">
              GST registration
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <SelectField
                label="Is the business GST-registered?"
                name="hasGstRegistration"
                value={profile.hasGstRegistration}
                onChange={(event) => {
                  handleChange(event);
                  if (event.target.value === "false") {
                    setProfile((previous) => ({
                      ...previous,
                      hasGstRegistration: "false",
                      gstin: "",
                      gstRegistrationType: "",
                    }));
                    setFieldErrors((previous) => ({
                      ...previous,
                      gstin: "",
                      gstRegistrationType: "",
                    }));
                  }
                }}
                options={[
                  { label: "Yes", value: "true" },
                  { label: "No", value: "false" },
                ]}
                error={fieldErrors.hasGstRegistration}
                required
              />
              {profile.hasGstRegistration === "true" && (
                <>
                  <TextField label="Business GSTIN" name="gstin" value={profile.gstin} onChange={handleChange} error={fieldErrors.gstin} required autoComplete="off" maxLength={15} />
                  <SelectField
                    label="GST registration type (optional)"
                    name="gstRegistrationType"
                    value={profile.gstRegistrationType}
                    onChange={handleChange}
                    options={REGISTRATION_TYPES}
                  />
                </>
              )}
            </div>
            <p className="mt-4 rounded-xl bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-900">
              GSTIN validation checks only the entered format. This app does not verify registration with government services or file GST returns.
            </p>
          </section>

          <div className="flex flex-col items-stretch gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={saving || businessProfileLoading || Boolean(businessProfileError)}
              className="min-h-11 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving
                ? "Saving..."
                : isSetup
                  ? "Save & Continue"
                  : "Save Business Details"}
            </button>
            {isSetup && <span className="text-xs text-slate-500">Fields marked * are required.</span>}
          </div>
        </form>
      </div>
    </main>
  );
};

export default BusinessSettings;
