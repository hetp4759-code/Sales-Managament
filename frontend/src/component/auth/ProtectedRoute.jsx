import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "../../hook/useAuth";

const ProtectedRoute = () => {
  const {
    admin,
    loading,
    sessionError,
    businessProfile,
    businessProfileLoading,
    businessProfileError,
    checkSession,
    retryBusinessProfile,
  } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7ecfb] text-sm text-indigo-700">
        Checking session...
      </div>
    );
  }

  if (sessionError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7ecfb] p-6">
        <section className="w-full max-w-md rounded-2xl border border-violet-950/10 bg-white p-8 text-center shadow-lg shadow-fuchsia-500/10">
          <h1 className="text-xl font-semibold text-indigo-950">
            Session unavailable
          </h1>
          <p role="alert" className="mt-3 text-sm text-red-700">
            {sessionError}
          </p>
          <button
            type="button"
            onClick={checkSession}
            className="mt-6 rounded-xl bg-gradient-to-r from-[#ff786e] via-[#f43f8c] to-[#cf20cf] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/20 transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-400/40"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (businessProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-indigo-700">
        Checking business setup...
      </div>
    );
  }

  if (businessProfileError && location.pathname !== "/business-settings") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Business profile unavailable
          </h1>
          <p role="alert" className="mt-3 text-sm text-red-700">
            {businessProfileError}
          </p>
          <button
            type="button"
            onClick={retryBusinessProfile}
            className="mt-6 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (
    !businessProfileError &&
    !businessProfile?.setupCompleted &&
    location.pathname !== "/business-settings"
  ) {
    return <Navigate to="/business-settings" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;