import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Layers3, LockKeyhole, Mail, Sparkles } from 'lucide-react';

import { APP_NAME } from '../lib/constants';
import { formatDbError } from '../lib/errors';
import { Button } from './ui';

export function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-10 dark:bg-stone-950">
      <div className="surface w-full max-w-xl p-6 text-stone-900 sm:p-8 dark:text-stone-100">
        <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Setup required</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Connect Supabase to start</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600 dark:text-stone-300">
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart the app.
        </p>
        <ol className="mt-5 space-y-2 text-sm leading-6 text-stone-700 dark:text-stone-200">
          <li>1. Run migrations <code>001</code> through <code>004</code>, then <code>006_portfolio_demo.sql</code>. Do not run <code>005_lock_to_login.sql</code>.</li>
          <li>2. In Authentication → Providers → Email, allow new signups.</li>
          <li>3. Enable Confirm email, then add your public site URL to the allowed redirect URLs in Supabase.</li>
        </ol>
      </div>
    </div>
  );
}

export function LoginScreen({
  onSignIn,
  onSignUp,
}: {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<boolean | void>;
}) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  function changeMode(nextMode: 'sign-in' | 'sign-up') {
    setMode(nextMode);
    setError(null);
    setConfirmationMessage(null);
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setConfirmationMessage(null);

    const normalizedEmail = email.trim();
    if (mode === 'sign-up' && password !== confirmPassword) {
      setError('Those passwords don’t match. Please check and try again.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'sign-up') {
        const confirmationRequired = await onSignUp(normalizedEmail, password);
        if (confirmationRequired) {
          setConfirmationMessage('Check your email for a confirmation link. Open it to verify your account, then sign in.');
        }
      } else {
        await onSignIn(normalizedEmail, password);
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Could not sign in. Check your email and password.';
      setError(formatDbError({ message }, message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f3ef] px-4 py-8 dark:bg-stone-950 sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-36 -top-40 h-[28rem] w-[28rem] rounded-full bg-amber-200/45 blur-3xl dark:bg-amber-900/10" />
        <div className="absolute -bottom-52 -right-36 h-[32rem] w-[32rem] rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-900/10" />
      </div>

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-2xl shadow-stone-900/10 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-900/80 dark:shadow-black/30 md:min-h-[620px] md:grid-cols-[1fr_0.92fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-stone-900 p-10 text-white dark:bg-stone-950 md:flex lg:p-14">
          <div aria-hidden="true" className="absolute -right-28 top-24 h-80 w-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-12 top-40 h-48 w-48 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <Layers3 size={21} />
            </span>
            <span className="text-sm font-semibold tracking-wide">{APP_NAME}</span>
          </div>

          <div className="relative max-w-md py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-stone-300">
              <Sparkles size={14} className="text-amber-300" />
              A calmer way to get things done
            </div>
            <h1 className="text-4xl font-semibold leading-[1.12] tracking-[-0.045em] lg:text-5xl">
              Make space for what matters.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-stone-300">
              Bring your notes, plans, and daily priorities together in one thoughtful workspace.
            </p>
          </div>

          <p className="relative text-xs tracking-wide text-stone-400">A little more clarity, every day.</p>
        </section>

        <section className="flex items-center justify-center p-6 text-stone-900 sm:p-10 lg:p-14 dark:text-stone-100">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex items-center gap-3 md:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900">
                <Layers3 size={21} />
              </span>
              <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
            </div>

            <>
                <div>
                  <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                    {mode === 'sign-up' ? 'Get started' : 'Welcome back'}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                    {mode === 'sign-up' ? 'Create your account' : 'Sign in to your space'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
                    {mode === 'sign-up' ? 'A few details and you’re ready to go.' : 'Pick up where you left off.'}
                  </p>
                </div>

                <div className="mt-7 grid grid-cols-2 rounded-xl bg-stone-100 p-1 dark:bg-stone-800" role="group" aria-label="Account access">
                  <button
                    type="button"
                    aria-pressed={mode === 'sign-in'}
                    className={`min-h-10 rounded-lg px-3 text-sm font-medium transition ${mode === 'sign-in' ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100'}`}
                    onClick={() => changeMode('sign-in')}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    aria-pressed={mode === 'sign-up'}
                    className={`min-h-10 rounded-lg px-3 text-sm font-medium transition ${mode === 'sign-up' ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white' : 'text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100'}`}
                    onClick={() => changeMode('sign-up')}
                  >
                    Create account
                  </button>
                </div>

                <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium" htmlFor="login-email">Email address</label>
                    <div className="relative">
                      <Mail size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        id="login-email"
                        className="field min-h-12 rounded-xl pl-10"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                  </div>

                  {mode === 'sign-up' && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium" htmlFor="login-confirm-password">Confirm password</label>
                      <div className="relative">
                        <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          id="login-confirm-password"
                          className="field min-h-12 rounded-xl pl-10 pr-11"
                          type={showConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          placeholder="Re-enter your password"
                          minLength={6}
                          required
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                        />
                        <button
                          type="button"
                          aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                          className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1.5 text-stone-500 transition hover:text-stone-900 dark:hover:text-stone-100"
                          onClick={() => setShowConfirmPassword((current) => !current)}
                        >
                          {showConfirmPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium" htmlFor="login-password">Password</label>
                    <div className="relative">
                      <LockKeyhole size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        id="login-password"
                        className="field min-h-12 rounded-xl pl-10 pr-11"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                        placeholder={mode === 'sign-up' ? 'At least 6 characters' : 'Enter your password'}
                        minLength={6}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md p-1.5 text-stone-500 transition hover:text-stone-900 dark:hover:text-stone-100"
                        onClick={() => setShowPassword((current) => !current)}
                      >
                        {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="rounded-xl bg-rose-50 p-3 text-sm leading-5 text-rose-700 dark:bg-rose-950 dark:text-rose-300" role="alert">{error}</p>}
                  {confirmationMessage && <p className="rounded-xl bg-teal-50 p-3 text-sm leading-5 text-teal-800 dark:bg-teal-950 dark:text-teal-200" role="status">{confirmationMessage}</p>}
                  <Button className="mt-2 min-h-12 w-full rounded-xl" variant="primary" type="submit" disabled={busy}>
                    {busy ? (mode === 'sign-up' ? 'Creating account…' : 'Signing in…') : (mode === 'sign-up' ? 'Create account' : 'Sign in')}
                    {!busy && <ArrowRight size={16} />}
                  </Button>
                </form>
            </>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 dark:bg-stone-950">
      <p className="text-sm text-stone-500" role="status">Checking your sign-in…</p>
    </div>
  );
}

export function AuthErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4 dark:bg-stone-950">
      <div className="surface w-full max-w-lg p-6 text-stone-900 dark:text-stone-100">
        <h1 className="text-xl font-semibold">Could not check your sign-in</h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{message}</p>
        <Button className="mt-4" variant="primary" onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
}
