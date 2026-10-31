import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AuthExperience, {
  EyeIcon,
  LockIcon,
  MailIcon,
} from "../component/auth/AuthExperience";
import useAuth from "../hook/useAuth";

const getLoginError = (error) =>
  error.response?.data?.message ||
  (error.response
    ? "Unable to log in. Please try again."
    : "Cannot reach the server. Check your connection and try again.");

const fieldClass =
  "auth-field block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-11 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 motion-reduce:transition-none";

const labelClass =
  "mb-2 block text-xs font-semibold text-slate-700";

const inputIconClass =
  "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400";

const Login = () => {
  const { admin, loading, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const registrationSuccess = location.state?.registrationSuccess;
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  if (loading) {
    return (
      <AuthExperience>
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600"
        >
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600 motion-reduce:animate-none"
          />
          Checking session...
        </div>
      </AuthExperience>
    );
  }

  if (admin) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Enter your email address and password.");
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getLoginError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthExperience>
      <div>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          Welcome back
          <span className="text-indigo-600">.</span>
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-500">
          Sign in to manage your business
        </p>
      </div>

      {registrationSuccess && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
        >
          {registrationSuccess}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-7 space-y-5"
        noValidate
        aria-busy={submitting}
        aria-describedby={errorMessage ? "login-error" : undefined}
      >
        <div>
          <label htmlFor="login-email" className={labelClass}>
            Email Address
          </label>

          <div className="relative">
            <MailIcon className={inputIconClass} />

            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={submitting}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className={labelClass}>
            Password
          </label>

          <div className="relative">
            <LockIcon className={inputIconClass} />

            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              disabled={submitting}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className={fieldClass}
            />

            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              aria-controls="login-password"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
        </div>

        {errorMessage && (
          <p
            id="login-error"
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
          >
            {errorMessage}
          </p>
        )}

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/15 transition duration-200 hover:bg-indigo-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
          >
            {submitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
                />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                >
                  →
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      <p className="auth-link mt-3 text-center text-sm leading-6 text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="rounded font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Register
        </Link>
      </p>
    </AuthExperience>
  );
};

export default Login;