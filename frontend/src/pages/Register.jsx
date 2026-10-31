import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthExperience, {
  EyeIcon,
  LockIcon,
  MailIcon,
} from "../component/auth/AuthExperience";
import useAuth from "../hook/useAuth";
import authService from "../service/authService";

const fieldClass =
  "auth-field block w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-11 text-sm text-slate-900 outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 motion-reduce:transition-none";

const labelClass =
  "mb-2 block text-xs font-semibold text-slate-700";

const inputIconClass =
  "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400";

const toggleClass =
  "absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Register = () => {
  const { admin, loading, register } = useAuth();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    setupKey: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    authService
      .setupStatus(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setStatus(result);
        }
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;

        setStatusError(
          requestError.response?.data?.message ||
            "Cannot reach the server. Check your connection and try again."
        );
      });

    return () => controller.abort();
  }, []);

  if (!loading && admin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting || loading || !status?.registrationOpen) {
      return;
    }

    setError("");

    if (!form.name.trim()) {
      setError("Enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (!emailPattern.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (!form.password) {
      setError("Enter a password.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!form.confirmPassword) {
      setError("Confirm your password.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (status?.setupKeyRequired && !form.setupKey.trim()) {
      setError("Enter the setup key.");
      return;
    }

    setSubmitting(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        ...(status?.setupKeyRequired && {
          setupKey: form.setupKey.trim(),
        }),
      });

      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      if (requestError.response?.data?.message) {
        setError(requestError.response.data.message);
      } else if (requestError.request) {
        setError(
          "Cannot reach the server. Check your connection and try again."
        );
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const checking = loading || (!status && !statusError);
  const registrationClosed = status && !status.registrationOpen;

  return (
    <AuthExperience>
      <div className="auth-register-intro">
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">
          {registrationClosed ? (
            <>
              Admin setup is complete
              <span className="text-indigo-600">.</span>
            </>
          ) : (
            <>
              Create your account
              <span className="text-indigo-600">.</span>
            </>
          )}
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-500">
          {registrationClosed
            ? "Sign in with the existing admin account to continue."
            : "Register to manage your business"}
        </p>

        {!registrationClosed && status?.setupKeyRequired && (
          <div className="auth-setup-note mt-4 flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3.5 py-3">
            <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />

            <p className="text-xs leading-6 text-indigo-800">
              First admin setup. Registration closes after the account
              is created. Your setup key is required to continue.
            </p>
          </div>
        )}
      </div>

      {statusError && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
        >
          {statusError}
        </div>
      )}

      {checking && (
        <div
          role="status"
          className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-600"
        >
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600 motion-reduce:animate-none"
          />
          Checking setup...
        </div>
      )}

      {!checking && registrationClosed && (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5"
        >
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600">
            <LockIcon className="h-5 w-5" />
          </span>

          <p className="text-sm font-semibold text-slate-900">
            Your workspace is already set up
          </p>

          <p className="mt-2 text-sm leading-7 text-slate-600">
            Registration is closed because the initial admin account
            has already been created. Contact your administrator if
            you need access.
          </p>
        </div>
      )}

      {!checking && status?.registrationOpen && (
        <form
          onSubmit={handleSubmit}
          className="auth-register-form mt-6 space-y-3"
          noValidate
          aria-busy={submitting}
          aria-describedby={error ? "registration-error" : undefined}
        >
          {error && (
            <p
              id="registration-error"
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
            >
              {error}
            </p>
          )}

          <div>
            <label htmlFor="reg-name" className={labelClass}>
              Full Name
            </label>

            <input
              id="reg-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              disabled={submitting}
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className={fieldClass.replace("pl-11", "pl-4")}
            />
          </div>

          <div>
            <label htmlFor="reg-email" className={labelClass}>
              Email Address
            </label>

            <div className="relative">
              <MailIcon className={inputIconClass} />

              <input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={submitting}
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" className={labelClass}>
              Password
            </label>

            <div className="relative">
              <LockIcon className={inputIconClass} />

              <input
                id="reg-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                disabled={submitting}
                value={form.password}
                onChange={handleChange}
                placeholder="Create a password"
                aria-describedby="reg-password-help"
                className={fieldClass}
              />

              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                aria-pressed={showPassword}
                aria-controls="reg-password"
                className={toggleClass}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>

            <p
              id="reg-password-help"
              className="mt-2 text-xs leading-5 text-slate-500"
            >
              Use at least 8 characters.
            </p>
          </div>

          <div>
            <label htmlFor="reg-confirm" className={labelClass}>
              Confirm Password
            </label>

            <div className="relative">
              <LockIcon className={inputIconClass} />

              <input
                id="reg-confirm"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                disabled={submitting}
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Enter your password again"
                className={fieldClass}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword((visible) => !visible)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                aria-pressed={showConfirmPassword}
                aria-controls="reg-confirm"
                className={toggleClass}
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          {status.setupKeyRequired && (
            <div>
              <label htmlFor="reg-setup-key" className={labelClass}>
                Setup Key
              </label>

              <div className="relative">
                <LockIcon className={inputIconClass} />

                <input
                  id="reg-setup-key"
                  name="setupKey"
                  type="password"
                  autoComplete="off"
                  required
                  disabled={submitting}
                  value={form.setupKey}
                  onChange={handleChange}
                  placeholder="Enter your setup key"
                  className={fieldClass}
                />
              </div>
            </div>
          )}

          <div className="pt-2">
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
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
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
      )}

      <p className="auth-link mt-3 text-center text-sm leading-6 text-slate-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="rounded font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Sign In
        </Link>
      </p>
    </AuthExperience>
  );
};

export default Register;