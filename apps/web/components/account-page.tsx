'use client';
import { useState } from 'react';
import Link from 'next/link';
import { accountRequest, useAccount } from './account-provider';
export function AccountPage() {
  const { user, flush, status } = useAccount();
  const [mode, setMode] = useState<'signin' | 'signup' | 'recover'>('signin'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState('');
  function leave() {
    localStorage.setItem('scripture-account-change', String(Date.now()));
    location.href = '/study';
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await accountRequest(`/${mode}`, 'POST', Object.fromEntries(form));
      if (result.recoveryCode) {
        setRecovery(result.recoveryCode);
        localStorage.setItem('scripture-account-change', String(Date.now()));
      } else leave();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function signout() {
    setBusy(true);
    try {
      await flush();
      await accountRequest('/signout', 'POST');
      leave();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function remove(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await flush();
      await accountRequest('', 'DELETE', {
        password: new FormData(event.currentTarget).get('password'),
      });
      leave();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="page-shell account-page">
      <span className="eyebrow">YOUR READING ROOM</span>
      <h1>
        {recovery
          ? 'Keep your recovery code safe'
          : user
            ? `Hello, ${user.name}.`
            : mode === 'signup'
              ? 'Make room for your reading.'
              : mode === 'recover'
                ? 'Recover your account.'
                : 'Welcome back.'}
      </h1>
      {recovery ? (
        <>
          <p>
            Save this code somewhere private. It can reset your password. We do not use email
            recovery. A new code replaces your previous code.
          </p>
          <code className="recovery-code">{recovery}</code>
          <button className="button primary" onClick={leave}>
            I saved my code · Continue
          </button>
        </>
      ) : user ? (
        <>
          <p>
            Signed in as @{user.username}. {status}
          </p>
          <Link className="button primary" href="/study">
            Open my dashboard
          </Link>
          <button className="quiet-button" disabled={busy} onClick={signout}>
            Sign out
          </button>
          <details>
            <summary>Delete my account</summary>
            <p>
              Permanently delete your account, sessions, bookmarks, notes, history and learning
              progress from the live database. Database backups may retain a copy until rotated.
              Guest data and offline public texts in this browser are separate.
            </p>
            <form onSubmit={remove}>
              <label>
                Confirm your password
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <button className="button" disabled={busy}>
                Permanently delete account
              </button>
            </form>
          </details>
        </>
      ) : (
        <>
          <p>
            {mode === 'signup'
              ? 'Save bookmarks, notes, Explore history, reading lessons and your activity calendar across devices. Free, with no email required.'
              : 'Your reading, saved in one place.'}
          </p>
          <form onSubmit={submit}>
            {mode === 'signup' && (
              <label>
                Your name
                <input name="name" maxLength={80} autoComplete="name" required />
              </label>
            )}
            <label>
              Username
              <input
                name="username"
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9_]{3,32}"
                autoComplete="username"
                required
              />
              <small>3–32 letters, numbers or underscores.</small>
            </label>
            {mode === 'recover' && (
              <label>
                Recovery code
                <input
                  name="recoveryCode"
                  minLength={48}
                  maxLength={48}
                  autoComplete="off"
                  required
                />
              </label>
            )}
            <label>
              {mode === 'recover' ? 'New password' : 'Password'}
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
              <small>At least 12 characters.</small>
            </label>
            <button className="button primary" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === 'signup'
                  ? 'Create account'
                  : mode === 'recover'
                    ? 'Reset password'
                    : 'Sign in'}
            </button>
          </form>
          <div className="account-actions">
            {(['signin', 'signup', 'recover'] as const)
              .filter((v) => v !== mode)
              .map((v) => (
                <button
                  className="quiet-button"
                  key={v}
                  onClick={() => {
                    setMode(v);
                    setError('');
                  }}
                >
                  {v === 'signin'
                    ? 'Sign in'
                    : v === 'signup'
                      ? 'Create an account'
                      : 'Forgot password?'}
                </button>
              ))}
          </div>
          <p>
            <Link href="/library">Continue reading as a guest</Link>
          </p>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
