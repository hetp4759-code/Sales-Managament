import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hook/useAuth";

const scrollToSection = (event, sectionId) => {
  event.preventDefault();
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

const overviewCards = [
  {
    title: "Record Every Transaction",
    description:
      "Store seller details, buyer information, contact numbers, product details, quantities, unit prices, and sale dates in one place.",
    icon: (
      <path d="M8 4h8a2 2 0 0 1 2 2v14H6V6a2 2 0 0 1 2-2ZM9 9h6M9 13h6M9 17h4" />
    ),
    accent: "bg-blue-50 text-blue-600",
  },
  {
    title: "Track Payments Clearly",
    description:
      "Record received amounts and automatically calculated outstanding balances. Understand whether a transaction is Paid, Partial, or Pending.",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Understand Your Sales",
    description:
      "Review previous transactions, monitor sales totals, compare collected amounts with pending balances, and access your sales records when needed.",
    icon: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    accent: "bg-violet-50 text-violet-600",
  },
];

const features = [
  {
    title: "Sales Recording",
    description:
      "Record seller, buyer, product, quantity, price, date, and transaction details.",
    icon: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
  },
  {
    title: "Payment Tracking",
    description:
      "Monitor the amount received, outstanding balance, and payment status.",
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
  },
  {
    title: "Sales History",
    description:
      "Review previous transactions in an organized table.",
    icon: (
      <>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </>
    ),
  },
  {
    title: "Search and Filters",
    description:
      "Find transactions using available search, payment method, and date filters.",
    icon: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-4.5-4.5" />
      </>
    ),
  },
  {
    title: "Business Dashboard",
    description:
      "Review sales totals, received payments, pending amounts, transaction counts, and payment-status summaries.",
    icon: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
  },
  {
    title: "Editable Sales Records",
    description:
      "Update supported transaction details when information changes.",
    icon: (
      <>
        <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
        <path d="m14 6 4 4" />
      </>
    ),
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Record a Sale",
    description:
      "Enter seller and buyer information, product details, quantity, unit price, and payment information.",
  },
  {
    number: "02",
    title: "Track Collections",
    description:
      "Record payments received and identify remaining customer balances.",
  },
  {
    number: "03",
    title: "Review Performance",
    description:
      "Use the Dashboard and Sales History to understand transactions and find records quickly.",
  },
];

const insights = [
  {
    title: "Reduce Record-Keeping Effort",
    description:
      "Keep transaction details organized instead of searching through scattered notes.",
  },
  {
    title: "Know What Has Been Collected",
    description:
      "Review received payments alongside total sale amounts.",
  },
  {
    title: "Identify Pending Payments",
    description:
      "See remaining balances and payment statuses to help follow up with customers.",
  },
  {
    title: "Find Past Transactions Faster",
    description:
      "Use Sales History search and filters to locate relevant records.",
  },
];

const Icon = ({ children, className = "h-5 w-5" }) => (
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
    {children}
  </svg>
);

const CheckIcon = () => (
  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600">
    <path d="m5 12 5 5L20 7" />
  </Icon>
);

function Home() {
  const { admin, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const getInitials = (name = "") =>
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  const onLogout = async () => {
    setProfileOpen(false);

    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navLinks = [
    { label: "Home", href: "#top" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Dashboard", to: "/dashboard" },
  ];

  return (
    <div id="top" className="min-h-screen bg-[#fbf9f7] text-slate-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 lg:px-8"
        >
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20">
              <Icon className="h-5 w-5">
                <path d="M4 19V12M10 19V8M16 19V5" />
                <path d="m3 9 6-5 5 3 7-5" />
                <path d="M17 2h4v4" />
              </Icon>
            </span>
            <span className="text-lg font-bold tracking-tight sm:text-xl">
              Sales<span className="text-blue-600">Flow</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(event) =>
                    scrollToSection(event, item.href.replace("#", ""))
                  }
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {item.label}
                </a>
              )
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {admin ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  aria-label="Open admin profile menu"
                  className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
                    {getInitials(admin.name)}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-[140px] truncate text-sm font-semibold text-slate-800">
                      {admin.name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      Administrator
                    </span>
                  </span>
                  <Icon className="h-4 w-4 text-slate-400">
                    <path d="m6 9 6 6 6-6" />
                  </Icon>
                </button>

                {profileOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close profile menu"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/10"
                    >
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {admin.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Administrator
                        </p>
                      </div>
                      <Link
                        to="/dashboard"
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
                        className="block px-4 py-2.5 text-sm text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={onLogout}
                        className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-4"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-5"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-peach-200/40 bg-orange-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 top-24 h-80 w-80 rounded-full bg-pink-200/30 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-200/25 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-24 lg:pt-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Smarter Sales Management
              </span>

              <h1 className="mt-6 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Every Sale. Every Payment.{" "}
                <span className="text-blue-600">One Clear Picture.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                Manage sales transactions, track customer payments, monitor
                outstanding balances, and review your business performance—all
                from one organized platform.
              </p>

              <div className="mt-8 flex flex-wrap gap-3.5">
                <Link
                  to="/sales-info"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                >
                  Get Started
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
                <Link
                  to="/sales-history"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition duration-300 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
                >
                  Explore Sales History
                </Link>
              </div>

              <ul className="mt-8 grid max-w-lg gap-3 text-sm text-slate-600 sm:grid-cols-3">
                {[
                  "Simple transaction management",
                  "Clear payment tracking",
                  "Organized sales records",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <CheckIcon />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Hero preview */}
            <div className="relative">
              <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-blue-100/60 via-pink-100/50 to-violet-100/50 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-indigo-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Sales Overview
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Illustrative preview
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    Sample data
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 p-5 sm:gap-4">
                  {[
                    {
                      label: "Total Sales",
                      value: "₹1,25,000",
                      className: "bg-blue-50 text-blue-700",
                    },
                    {
                      label: "Amount Received",
                      value: "₹95,000",
                      className: "bg-emerald-50 text-emerald-700",
                    },
                    {
                      label: "Pending Balance",
                      value: "₹30,000",
                      className: "bg-amber-50 text-amber-700",
                    },
                    {
                      label: "Total Transactions",
                      value: "48",
                      className: "bg-violet-50 text-violet-700",
                    },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className={`rounded-2xl p-4 ${metric.className}`}
                    >
                      <p className="text-xs font-medium text-slate-600">
                        {metric.label}
                      </p>
                      <p className="mt-1.5 text-xl font-bold text-slate-900 sm:text-2xl">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mx-5 mb-5 rounded-2xl border border-slate-100 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">
                      Sales Activity
                    </p>
                    <span className="text-xs text-slate-400">
                      Demo visualization
                    </span>
                  </div>
                  <div className="flex h-28 items-end justify-around gap-2 sm:h-32 sm:gap-3">
                    {[42, 65, 50, 85, 58, 100, 72].map((height, index) => (
                      <div
                        key={index}
                        className="w-full rounded-t-lg bg-gradient-to-t from-blue-600/80 to-indigo-400/80 transition hover:from-blue-700 hover:to-indigo-500"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-around text-[11px] text-slate-400">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (day) => (
                        <span key={day}>{day}</span>
                      )
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center text-xs text-slate-500">
                  Preview only — sample values are not connected to live sales
                  data.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Business overview */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Your Sales Business, Organized in One Place
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                SalesFlow helps you maintain accurate transaction records,
                understand payment collection, and quickly find the information
                you need to manage your daily business.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {overviewCards.map((card) => (
                <article
                  key={card.title}
                  className="group rounded-3xl border border-slate-200 bg-[#fbf9f7] p-7 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5"
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.accent}`}
                  >
                    <Icon>{card.icon}</Icon>
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {card.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="scroll-mt-24 bg-[#fbf9f7] py-20 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Everything You Need to Manage Sales
              </h2>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                    <Icon>{feature.icon}</Icon>
                  </span>
                  <h3 className="mt-5 text-base font-bold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-24 bg-white py-20 sm:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                How It Works
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                A Simple Sales Management Workflow
              </h2>
            </div>

            <div className="relative mt-12 grid gap-6 md:grid-cols-3">
              <div
                aria-hidden="true"
                className="absolute left-0 right-0 top-14 hidden border-t-2 border-dashed border-slate-200 md:block"
              />
              {workflowSteps.map((step) => (
                <article
                  key={step.number}
                  className="relative rounded-3xl border border-slate-200 bg-[#fbf9f7] p-7 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-600/20">
                    {step.number}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {step.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard preview */}
        <section className="bg-[#fbf9f7] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                See Your Business at a Glance
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Review sales totals, collections, pending amounts, and
                transaction activity in one organized view.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-indigo-900/10">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-base font-bold text-slate-900">
                    Business Dashboard
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Illustrative preview with sample data
                  </p>
                </div>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                >
                  Explore Dashboard
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Total Sales", "₹1,25,000", "bg-blue-50 text-blue-700"],
                  ["Total Received", "₹95,000", "bg-emerald-50 text-emerald-700"],
                  ["Pending Amount", "₹30,000", "bg-amber-50 text-amber-700"],
                  ["Total Transactions", "48", "bg-violet-50 text-violet-700"],
                ].map(([label, value, className]) => (
                  <div
                    key={label}
                    className={`rounded-2xl p-5 ${className}`}
                  >
                    <p className="text-xs font-medium text-slate-600">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 px-6 pb-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-slate-100 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">
                      Sales Overview
                    </p>
                    <span className="text-xs text-slate-400">
                      Demo chart
                    </span>
                  </div>
                  <div className="flex h-40 items-end justify-around gap-2 sm:gap-3">
                    {[35, 55, 45, 70, 60, 90, 75].map((height, index) => (
                      <div
                        key={index}
                        className="w-full rounded-t-lg bg-gradient-to-t from-blue-600/80 to-indigo-400/80"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex justify-around text-[11px] text-slate-400">
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(
                      (month) => (
                        <span key={month}>{month}</span>
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-5">
                  <p className="text-sm font-semibold text-slate-800">
                    Sales by Payment Status
                  </p>
                  <div className="mt-6 space-y-5">
                    {[
                      ["Paid", "58%", "bg-emerald-500"],
                      ["Partial", "27%", "bg-amber-500"],
                      ["Pending", "15%", "bg-blue-500"],
                    ].map(([label, width, color]) => (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">
                            {label}
                          </span>
                          <span className="text-slate-500">{width}</span>
                        </div>
                        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${color}`}
                            style={{ width }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-xs text-slate-500">
                    Sample distribution for visual demonstration only.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Insights */}
        <section className="bg-white py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                  Business Insights
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Built for Everyday Business Operations
                </h2>
                <p className="mt-4 max-w-lg text-base leading-8 text-slate-600">
                  SalesFlow keeps essential sales information organized so you
                  can spend less time searching and more time managing your
                  business.
                </p>
                <Link
                  to="/sales-info"
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                >
                  Add a New Sale
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {insights.map((insight, index) => (
                  <article
                    key={insight.title}
                    className="rounded-3xl border border-slate-200 bg-[#fbf9f7] p-6 transition duration-300 hover:border-blue-200 hover:bg-white hover:shadow-lg hover:shadow-blue-900/5"
                  >
                    <span className="text-sm font-bold text-blue-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-3 text-base font-bold text-slate-900">
                      {insight.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {insight.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-20 sm:pb-24 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-white sm:px-12 sm:py-16 lg:px-16">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Take Control of Your{" "}
                  <span className="text-blue-400">Sales Today.</span>
                </h2>
                <p className="mt-5 max-w-lg leading-8 text-slate-300">
                  Keep transactions organized, understand your collections, and
                  make your daily sales management simpler.
                </p>
              </div>

              <div className="flex flex-wrap gap-3.5 md:justify-end">
                <Link
                  to="/sales-info"
                  className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40"
                >
                  Add New Sale
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
                <Link
                  to="/sales-history"
                  className="inline-flex items-center rounded-xl border border-slate-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
                >
                  View Sales History
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <Link to="/" className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                  <Icon className="h-4.5 w-4.5">
                    <path d="M4 19V12M10 19V8M16 19V5" />
                    <path d="m3 9 6-5 5 3 7-5" />
                  </Icon>
                </span>
                <span className="text-lg font-bold tracking-tight">
                  Sales<span className="text-blue-600">Flow</span>
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-7 text-slate-600">
                SalesFlow helps businesses record sales, track payments, and
                review transaction history in one organized platform.
              </p>
            </div>

            <nav aria-label="Footer navigation">
              <p className="text-sm font-semibold text-slate-900">Explore</p>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-600">
                <Link to="/" className="transition hover:text-blue-700">
                  Home
                </Link>
                <Link
                  to="/sales-info"
                  className="transition hover:text-blue-700"
                >
                  Sales Info
                </Link>
                <Link
                  to="/sales-history"
                  className="transition hover:text-blue-700"
                >
                  Sales History
                </Link>
                <Link to="/dashboard" className="transition hover:text-blue-700">
                  Dashboard
                </Link>
                <Link to="/login" className="transition hover:text-blue-700">
                  Login
                </Link>
              </div>
            </nav>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 text-sm text-slate-500">
            © {new Date().getFullYear()} SalesFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;