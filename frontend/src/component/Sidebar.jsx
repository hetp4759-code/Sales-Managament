import { useState } from "react";
import { NavLink, useNavigate,Link } from "react-router-dom";
import useAuth from "../hook/useAuth";

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-5 w-5 shrink-0",
};

const CartIcon = () => (
  <svg {...iconProps} strokeWidth={2} className="h-8 w-8 shrink-0">
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2 3h3l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.1L21 7H6" />
  </svg>
);

const HomeIcon = () => (
  <svg {...iconProps}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M10 21v-6h4v6" />
  </svg>
);

const DocumentIcon = () => (
  <svg {...iconProps}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h4" />
  </svg>
);

const HistoryIcon = () => (
  <svg {...iconProps}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v5h5" />
    <path d="M12 7v5l3 2" />
  </svg>
);

const StockIcon = () => (
  <svg {...iconProps}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
  </svg>
);

const LogoutIcon = () => (
  <svg {...iconProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </svg>
);

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: HomeIcon },
  { label: "Sales Info", to: "/sales-info", icon: DocumentIcon },
  { label: "Sales History", to: "/sales-history", icon: HistoryIcon },
  { label: "Purchase Management", to: "/purchases", icon: DocumentIcon },
  { label: "Purchase History", to: "/purchase-history", icon: HistoryIcon },
  { label: "Inventory", to: "/inventory", icon: StockIcon },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
    isActive
      ? "bg-blue-600 text-white"
      : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;

const Sidebar = () => {
  const navigate = useNavigate();
  const { admin, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(
        error.response?.data?.message ||
          "Unable to contact the server to end your session."
      );
    } finally {
      setLoggingOut(false);
    }
  };

  return (
<aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col bg-[#0b1d4a] px-4 py-6 text-white">

  {/* Logo — click to go Home */}
  <Link
    to="/"
    aria-label="Go to Home"
    className="mb-8 flex items-center gap-2.5 rounded-lg px-2 text-blue-500 transition-opacity hover:opacity-80"
  >
    <CartIcon />

    <span className="text-xl font-bold tracking-tight text-white">
      SalesManager
    </span>
  </Link>

  {/* Navigation */}
  <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1.5">
    {navItems.map(({ label, to, icon: Icon }) => (
      <NavLink key={to} to={to} className={linkClass}>
        <Icon />
        <span>{label}</span>
      </NavLink>
    ))}
  </nav>

  {admin && (
    <div className="mb-3 truncate px-4 text-xs text-slate-400">
      {admin.name}
      <Link
        to="/business-settings"
        className="mt-1 block w-fit text-slate-300 underline-offset-2 hover:text-white hover:underline"
      >
        Business details
      </Link>
    </div>
  )}

  {logoutError && (
    <p role="alert" className="mb-2 px-2 text-xs text-red-300">
      {logoutError}
    </p>
  )}

  {/* Logout */}
  <button
    type="button"
    onClick={handleLogout}
    disabled={loggingOut}
    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-wait disabled:opacity-60"
  >
    <LogoutIcon />
    <span>{loggingOut ? "Logging out..." : "Logout"}</span>
  </button>

</aside>
  );
};

export default Sidebar;