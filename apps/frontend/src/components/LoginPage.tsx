import { useEffect, useState, type FormEvent } from 'react';
import {
  ApiErrorResponseSchema,
  LoginInputSchema,
  useLoginMutation,
  type LoginInput,
} from '@/services/api/auth-api';
import { BrandMark } from './BrandMark';
import { MobileNumberInput } from './form/MobileNumberInput';
type FieldErrors = Partial<Record<keyof LoginInput, string>>;

export const LoginPage = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [login, { isLoading }] = useLoginMutation();

  useEffect(() => {
    if (retryAfterSeconds <= 0) return;
    const timer = window.setInterval(
      () => setRetryAfterSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [retryAfterSeconds]);

  const clearFieldError = (field: keyof LoginInput) => {
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateField = (field: keyof LoginInput, value: string) => {
    const result = LoginInputSchema.shape[field].safeParse(value);
    if (result.success) {
      clearFieldError(field);
    } else {
      setFieldErrors((current) => ({
        ...current,
        [field]: result.error.issues[0]?.message ?? 'Invalid value',
      }));
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (retryAfterSeconds > 0) return;
    setMessage('');
    const input = LoginInputSchema.safeParse({ mobile, password });
    if (!input.success) {
      const errors: FieldErrors = {};
      for (const issue of input.error.issues) {
        const field = issue.path[0];
        if ((field === 'mobile' || field === 'password') && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    try {
      await login(input.data).unwrap();
    } catch (error) {
      const apiError = ApiErrorResponseSchema.safeParse(error);
      if (apiError.success) {
        if (apiError.data.data.error.code === 'TOO_MANY_LOGIN_ATTEMPTS') {
          setRetryAfterSeconds(apiError.data.data.error.retryAfterSeconds ?? 15 * 60);
        }
        const backendFieldErrors: FieldErrors = {};
        for (const detail of apiError.data.data.error.details ?? []) {
          if (detail.path === 'mobile' || detail.path === 'password') {
            backendFieldErrors[detail.path] = detail.message;
          }
        }
        setFieldErrors(backendFieldErrors);
        setMessage(apiError.data.data.error.message);
      } else {
        setMessage('Unable to sign in. Check the connection and try again.');
      }
    }
  };
  return (
    <main className="grid min-h-screen bg-stone-100 lg:grid-cols-[minmax(0,1fr)_minmax(28rem,38rem)]">
      <section className="login-brand-panel hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandMark large />
        <div className="max-w-xl">
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-brand-200">
            Business management
          </p>
          <h1 className="text-5xl font-bold leading-tight">
            Clear records.
            <br />
            Confident decisions.
          </h1>
          <p className="mt-6 text-lg leading-8 text-green-100">
            A simple workspace for the daily work at Dhakad Grading Plant.
          </p>
        </div>
        <p className="text-sm text-green-200">Secure access for administrators and staff</p>
      </section>
      <section className="login-form-panel flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandMark large />
          </div>
          <p className="text-sm font-bold uppercase tracking-widest text-brand-700">Welcome back</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-950">
            Sign in to continue
          </h1>
          <p className="mt-3 text-stone-600">
            Use the mobile number and password provided by your administrator.
          </p>
          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => void submit(event)}
            autoComplete="off"
            noValidate
          >
            <MobileNumberInput
              id="mobile"
              label="Mobile number"
              value={mobile}
              onChange={(value) => {
                setMobile(value);
                clearFieldError('mobile');
              }}
              onBlur={() => validateField('mobile', mobile)}
              error={fieldErrors.mobile}
              autoComplete="one-time-code"
              preventAutoFill
            />
            <div>
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <div
                className={`mt-2 flex rounded-xl border bg-brand-50/70 shadow-sm transition focus-within:bg-white focus-within:ring-2 ${
                  fieldErrors.password
                    ? 'border-red-500 focus-within:border-red-600 focus-within:ring-red-100'
                    : 'border-brand-200 focus-within:border-brand-700 focus-within:ring-brand-100'
                }`}
              >
                <input
                  id="password"
                  name="login-secret-entry"
                  className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 font-medium text-stone-900 caret-brand-700 outline-none"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="one-time-code"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-lpignore="true"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFieldError('password');
                  }}
                  onBlur={() => validateField('password', password)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                />
                <button
                  className="grid min-h-12 min-w-12 place-items-center rounded-r-xl border-l border-brand-200 bg-brand-100/60 text-brand-800 transition hover:bg-brand-200/70 focus-visible:bg-white"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5 9 5a16.6 16.6 0 01-2.1 2.5M6.6 6.6C4.3 8.1 3 10 3 10s3.5 5 9 5a9.8 9.8 0 004-.8" />
                    </svg>
                  ) : (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p
                  id="password-error"
                  className="mt-2 text-sm font-medium text-red-700"
                  role="alert"
                >
                  {fieldErrors.password}
                </p>
              )}
            </div>
            {message && (
              <p
                id="login-error"
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {retryAfterSeconds > 0
                  ? `Too many login attempts. Try again in ${String(Math.floor(retryAfterSeconds / 60)).padStart(2, '0')}:${String(retryAfterSeconds % 60).padStart(2, '0')}.`
                  : message}
              </p>
            )}
            <button
              className="primary-button w-full"
              type="submit"
              disabled={isLoading || retryAfterSeconds > 0}
            >
              {isLoading
                ? 'Signing in…'
                : retryAfterSeconds > 0
                  ? `Try again in ${String(Math.floor(retryAfterSeconds / 60)).padStart(2, '0')}:${String(retryAfterSeconds % 60).padStart(2, '0')}`
                  : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};
