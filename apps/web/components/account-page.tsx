'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { accountRequest, useAccount } from './account-provider';
type Mode = 'signin' | 'signup' | 'recover';
const googleErrors: Record<string, string> = {
  state: 'That Google sign-in expired. Please try again.',
  cancelled: 'Google sign-in was cancelled. You can try again or use your website password.',
  session: 'Sign in again before linking or deleting an account.',
  link_required:
    'An account already uses this email. Sign in with your website password, then choose Link Google in account settings.',
  link_conflict:
    'This Google identity cannot be linked to the current account. Use the Google account that matches your email.',
  identity: 'The Google account did not match. Your account was not deleted.',
  callback: 'Google sign-in could not be completed. Please try again.',
  unavailable:
    'Google sign-in is not enabled yet. Use email or username and your website password.',
};
export function AccountPage({ initialMode = 'signin' }: { initialMode?: Mode }) {
  const { user, flush, status } = useAccount();
  const [mode, setMode] = useState<Mode>(initialMode),
    [stage, setStage] = useState<'identifier' | 'password'>(
      initialMode === 'signin' ? 'identifier' : 'password',
    ),
    [identifier, setIdentifier] = useState(''),
    [useUsername, setUseUsername] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [recovery, setRecovery] = useState(''),
    [google, setGoogle] = useState(false),
    [googleOnly, setGoogleOnly] = useState(false);
  useEffect(() => {
    setMode(initialMode);
    setStage(initialMode === 'signin' ? 'identifier' : 'password');
    setError('');
  }, [initialMode]);
  useEffect(() => {
    void accountRequest('/options')
      .then((result) => setGoogle(result.google))
      .catch(() => {});
    const params = new URLSearchParams(location.search);
    if (params.has('googleError'))
      setError(googleErrors[params.get('googleError')!] ?? googleErrors.callback);
    if (params.has('deleted')) setNotice('Your account and live saved data were deleted.');
  }, []);
  function signalChange() {
    try {
      localStorage.setItem('scripture-account-change', String(Date.now()));
    } catch {
      /* Account navigation still works when browser storage is blocked. */
    }
  }
  function leave() {
    signalChange();
    location.href = '/study';
  }
  function switchMode(next: Mode) {
    setMode(next);
    setStage(next === 'signin' ? 'identifier' : 'password');
    setError('');
    setGoogleOnly(false);
    history.replaceState(null, '', `/account/${next}`);
  }
  async function startGoogle(purpose: 'signin' | 'link' | 'delete') {
    setBusy(true);
    setError('');
    try {
      if (user) await flush();
      const result = await accountRequest('/google/start', 'POST', { purpose });
      location.assign(result.url);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget),
      value = identifier.trim().toLowerCase();
    try {
      if (mode === 'signin' && stage === 'identifier') {
        const result = await accountRequest('/identify', 'POST', { identifier: value });
        if (result.next === 'signup') {
          setUseUsername(!value.includes('@'));
          switchMode('signup');
          setNotice('No account uses this email or username yet. Create your account below.');
        } else {
          setGoogleOnly(!result.password_login && result.google_login);
          setStage('password');
          setNotice(
            !result.password_login
              ? 'This account uses Google sign-in. Continue with Google above.'
              : 'Enter your Open Scripture password to continue.',
          );
        }
        return;
      }
      const body =
        mode === 'signup'
          ? {
              name: form.get('name'),
              ...(value.includes('@') ? { email: value } : { username: value }),
              password: form.get('password'),
            }
          : {
              identifier: value,
              password: form.get('password'),
              ...(mode === 'recover' ? { recoveryCode: form.get('recoveryCode') } : {}),
            };
      const result = await accountRequest(`/${mode}`, 'POST', body);
      if (result.recoveryCode) {
        setRecovery(result.recoveryCode);
        signalChange();
      } else leave();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'ACCOUNT_EXISTS' && value.includes('@')) {
        switchMode('signin');
        setNotice('An account already uses this email. Continue to sign in.');
      } else setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function signout() {
    setBusy(true);
    setError('');
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
    const password = new FormData(event.currentTarget).get('password');
    setBusy(true);
    setError('');
    try {
      await flush();
      await accountRequest('', 'DELETE', { password });
      leave();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const isEmail = identifier.includes('@'),
    identifierType = mode === 'signup' && !useUsername ? 'email' : 'text';
  return (
    <div className="page-shell account-page">
      <span className="eyebrow">YOUR READING ROOM</span>
      {!user && !recovery && (
        <nav className="account-tabs" aria-label="Account access">
          <Link href="/account/signin" aria-current={mode === 'signin' ? 'page' : undefined}>
            Sign in
          </Link>
          <Link href="/account/signup" aria-current={mode === 'signup' ? 'page' : undefined}>
            Sign up
          </Link>
        </nav>
      )}
      <h1>
        {recovery
          ? 'Keep your recovery code safe'
          : user
            ? `Hello, ${user.name}.`
            : mode === 'signup'
              ? 'Create your account.'
              : mode === 'recover'
                ? 'Recover your account.'
                : 'Welcome back.'}
      </h1>
      {recovery ? (
        <>
          <p>
            Save this private code. It can reset your website password if you forget it. We do not
            send email recovery messages. A new code replaces your previous code.
          </p>
          <code className="recovery-code">{recovery}</code>
          <button className="button primary" onClick={leave}>
            I saved my code · Continue
          </button>
        </>
      ) : user ? (
        <>
          <p>
            Signed in as {user.email ?? `@${user.username}`}. {status}
          </p>
          <Link className="button primary" href="/study">
            Open my dashboard
          </Link>
          <button className="quiet-button" disabled={busy} onClick={signout}>
            Sign out
          </button>
          {google && !user.google_login && (
            <div className="account-provider-option">
              <p>Link Google to sign in with the same account and keep your saved reading.</p>
              <button className="button" disabled={busy} onClick={() => startGoogle('link')}>
                Link Google
              </button>
            </div>
          )}
          <details>
            <summary>Delete my account</summary>
            <p>
              Permanently delete your account, sessions, bookmarks, notes, history and learning
              progress from the live database. Backups may retain a copy until rotated. Guest data
              and offline public texts in this browser are separate.
            </p>
            {user.password_login !== false ? (
              <form onSubmit={remove}>
                <label>
                  Confirm your password
                  <input name="password" type="password" autoComplete="current-password" required />
                </label>
                <button className="button" disabled={busy}>
                  Permanently delete account
                </button>
              </form>
            ) : (
              <button
                className="button"
                disabled={busy || !google}
                onClick={() => startGoogle('delete')}
              >
                Confirm with Google and delete account
              </button>
            )}
          </details>
        </>
      ) : (
        <>
          <p>
            {mode === 'signup'
              ? 'Your bookmarks, reading plans and conversations, saved across devices. Free.'
              : mode === 'recover'
                ? 'Use the recovery code you saved when creating your account.'
                : 'Your reading, saved in one place.'}
          </p>
          {mode !== 'recover' && (
            <div className="account-provider-option">
              {google ? (
                <>
                  <button
                    className="button google-button"
                    disabled={busy}
                    onClick={() => startGoogle('signin')}
                  >
                    <span aria-hidden="true">G</span>Continue with Google
                  </button>
                  <p className="account-help">
                    New here? Google sign-in creates your account automatically. Use Edge, Chrome or
                    another full browser if an embedded browser blocks Google.
                  </p>
                  <div className="account-divider">or use your email</div>
                </>
              ) : (
                <p className="account-help">
                  Gmail, Outlook and other email addresses work below with a password for this
                  website. One-click Google sign-in is awaiting setup.
                </p>
              )}
            </div>
          )}
          {notice && (
            <p className="account-notice" role="status">
              {notice}
            </p>
          )}
          <form onSubmit={submit} key={mode}>
            {mode === 'signup' && (
              <label htmlFor="account-name">
                Your name
                <input id="account-name" name="name" maxLength={80} autoComplete="name" required />
              </label>
            )}
            <label htmlFor="account-identifier">
              {mode === 'signup'
                ? useUsername
                  ? 'Username'
                  : 'Email address'
                : 'Email or username'}
              <input
                id="account-identifier"
                name="identifier"
                type={identifierType}
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError('');
                }}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={mode === 'signup' && useUsername ? 32 : 254}
                minLength={mode === 'signup' && useUsername ? 3 : undefined}
                pattern={mode === 'signup' && useUsername ? '[a-zA-Z0-9_]{3,32}' : undefined}
                required
                readOnly={mode === 'signin' && stage === 'password'}
              />
            </label>
            {mode === 'signup' && (
              <button
                type="button"
                className="quiet-button account-identifier-switch"
                onClick={() => {
                  setUseUsername(!useUsername);
                  setIdentifier('');
                  setError('');
                }}
              >
                {useUsername ? 'Use email instead' : 'Use a username instead'}
              </button>
            )}
            {mode === 'signin' && stage === 'password' && (
              <button
                type="button"
                className="quiet-button account-identifier-switch"
                onClick={() => {
                  setStage('identifier');
                  setGoogleOnly(false);
                  setNotice('');
                }}
              >
                Use another email or username
              </button>
            )}
            {mode === 'recover' && (
              <label htmlFor="account-recovery">
                Recovery code
                <input
                  id="account-recovery"
                  name="recoveryCode"
                  minLength={48}
                  maxLength={48}
                  autoComplete="off"
                  required
                />
              </label>
            )}
            {(mode !== 'signin' || stage === 'password') && !googleOnly && (
              <label htmlFor="account-password">
                {mode === 'recover' ? 'New website password' : 'Website password'}
                <input
                  id="account-password"
                  aria-label={mode === 'recover' ? 'New website password' : 'Website password'}
                  name="password"
                  type="password"
                  minLength={12}
                  maxLength={128}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  aria-describedby="account-password-help"
                />
                <small id="account-password-help">
                  At least 12 characters. Use your Open Scripture password, not your email password.
                </small>
              </label>
            )}
            {!googleOnly && (
              <button className="button primary" disabled={busy}>
                {busy
                  ? 'Please wait…'
                  : mode === 'signup'
                    ? 'Create account'
                    : mode === 'recover'
                      ? 'Reset password'
                      : stage === 'identifier'
                        ? 'Continue with email or username'
                        : 'Sign in'}
              </button>
            )}
          </form>
          <div className="account-actions">
            {mode !== 'recover' && <Link href="/account/recover">Forgot password?</Link>}
            {mode === 'recover' && <Link href="/account/signin">Back to sign in</Link>}
          </div>
          <p className="account-help">
            {mode === 'signup' && isEmail
              ? 'Your email is a login address. We do not send emails or claim to have verified it. '
              : ''}
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
