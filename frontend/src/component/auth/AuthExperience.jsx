import { Link } from "react-router-dom";

const BrandMark = () => (
  <span   className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/15 sm:h-10 sm:w-10">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M4 19V12M10 19V8M16 19V5" />
      <path d="m3 9 6-5 5 3 7-5" />
      <path d="M17 2h4v4" />
    </svg>
  </span>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 shrink-0"
    aria-hidden="true"
  >
    <path d="m5 12 5 5L20 7" />
  </svg>
);

const MetricCard = ({ label, value, tone }) => (
  <div className={`min-w-0 rounded-2xl p-4 ${tone}`}>
    <p className="text-[11px] font-medium leading-5 text-slate-600">
      {label}
    </p>
    <p className="mt-1 break-words text-lg font-bold tracking-tight text-slate-900">
      {value}
    </p>
  </div>
);

const SalesPreview = () => (
  <div className="relative mt-9">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-white/60 blur-xl"
    />

    <div className="relative overflow-hidden rounded-3xl border border-white bg-white shadow-[0_20px_65px_-30px_rgba(49,46,129,0.25)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Business overview
          </p>
          <p className="mt-1 text-xs text-slate-500">
            A clearer view of your sales
          </p>
        </div>

        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
          Sample data
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5">
        <MetricCard
          label="Total Sales"
          value="₹1,25,000"
          tone="bg-indigo-50"
        />
        <MetricCard
          label="Amount Received"
          value="₹95,000"
          tone="bg-emerald-50"
        />
        <MetricCard
          label="Pending Balance"
          value="₹30,000"
          tone="bg-orange-50"
        />
        <MetricCard
          label="Total Transactions"
          value="48"
          tone="bg-violet-50"
        />
      </div>

      <div className="mx-5 mb-5 rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-800">
            Sales activity
          </p>
          <p className="text-[10px] text-slate-500">
            Illustrative chart
          </p>
        </div>

        <div
          aria-hidden="true"
          className="relative mt-5 h-28"
        >
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2, 3].map((line) => (
              <div
                key={line}
                className="border-t border-dashed border-slate-100"
              />
            ))}
          </div>

          <div className="absolute inset-0 flex items-end justify-around gap-3">
            {[32, 49, 40, 64, 56, 84, 73].map((height, index) => (
              <div
                key={index}
                className={`w-full max-w-[28px] rounded-t-md ${
                  index === 5 ? "bg-indigo-600" : "bg-indigo-200"
                }`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        <div className="mt-3 flex justify-around text-[10px] text-slate-500">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
            (day) => (
              <span key={day}>{day}</span>
            )
          )}
        </div>
      </div>

      <p className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-center text-[10px] leading-5 text-slate-500">
        Illustrative sample values — not connected to live business data.
      </p>
    </div>
  </div>
);

const AuthExperience = ({ children }) => (
  <main className="auth-page relative isolate flex flex-col bg-[#fbf9f7] text-slate-900">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-orange-100/60 blur-3xl" />
      <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-violet-100/60 blur-3xl" />
    </div>

    <header className="auth-header mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
      <Link
        to="/"
        aria-label="SalesFlow home"
        className="flex items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
      >
        <BrandMark />
        <span className="text-lg font-bold tracking-tight sm:text-xl">
          Sales<span className="text-indigo-600">Flow</span>
        </span>
      </Link>

      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
      >
        <span aria-hidden="true">←</span>
        Back to home
      </Link>
    </header>

    <div className="auth-main flex flex-1 items-center justify-center">
      <div className="auth-card grid overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_25px_90px_-45px_rgba(15,23,42,0.22)] lg:grid-cols-2">
        {/* Shared form panel */}
        <section
          aria-label="Account access"
          className="auth-form-panel flex min-w-0 items-center justify-center"
        >
          <div className="auth-form-content w-full max-w-sm">
            <div className="auth-workspace-badge mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-700 sm:mb-5">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-indigo-500"
              />
              Your sales workspace
            </div>

            {children}

            <div className="auth-security-footer mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <LockIcon className="h-3.5 w-3.5 text-slate-400" />
              SalesFlow · Admin access
            </div>
          </div>
        </section>

        {/* Promotional panel — hidden on mobile and tablet */}
        <aside
          aria-label="SalesFlow platform preview"
          className="auth-promo relative hidden min-w-0 overflow-hidden border-l border-slate-100 bg-[#f4f2fb] p-8 lg:block xl:p-10"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#f7dfd6]/60 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-indigo-100/60 blur-2xl"
          />

          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">
              Simple. Clear. Organized.
            </p>

            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-slate-900 xl:text-4xl">
              Every sale.
              <br />
              Every payment.
              <br />
              <span className="text-indigo-600">One clear picture.</span>
            </h2>

            <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
              Keep your transactions organized, understand your collections,
              and make daily sales management simpler.
            </p>

            <SalesPreview />

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-3 text-xs font-medium text-slate-600">
              {[
                "Organized records",
                "Payment tracking",
                "Clear insights",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-1.5">
                  <span className="text-indigo-600">
                    <CheckIcon />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>

  </main>
);

export const MailIcon = ({ className = "h-4 w-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const LockIcon = ({ className = "h-4 w-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
  </svg>
);

export const EyeIcon = ({ visible, className = "h-4 w-4" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {visible ? (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4 9.5 7-.4 1.2-1.2 2.4-2.3 3.5" />
        <path d="M6.2 6.2C4.1 7.5 2.9 9.6 2.5 12c.5 1.4 1.5 2.8 3 3.9A10.5 10.5 0 0 0 12 18c.7 0 1.4-.1 2.1-.2" />
      </>
    ) : (
      <>
        <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    )}
  </svg>
);

export default AuthExperience;