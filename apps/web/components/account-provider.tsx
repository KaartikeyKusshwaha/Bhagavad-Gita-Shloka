'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { accountStorage, personalGet } from '../lib/personal-storage';
import { emptyLearning, parseAccountData } from '@core/shared/src/account-data';
import { parseDeviceData } from '@core/shared/src/device-data';
type User = {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  password_login?: boolean;
  google_login?: boolean;
};
const Context = createContext<{ user: User | null; status: string; flush: () => Promise<void> }>({
  user: null,
  status: '',
  flush: async () => {},
});
export const useAccount = () => useContext(Context);
export async function accountRequest(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`/v1/account${path}`, {
    method,
    headers: {
      'X-Scripture-Client': '1',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error?.message ?? 'Account request failed.'), {
      code: data.error?.code,
    });
  return data;
}
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState('');
  const flush = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    document.body.dataset.accountSync =
      status === 'Saving…' ? 'saving' : ready ? 'ready' : 'loading';
  }, [status, ready]);
  useEffect(() => {
    let closed = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      revision = 0,
      dirty = false,
      blocked = false;
    let pending: Promise<void> | null = null;
    let accountId = '';
    const accountChanged = (event: StorageEvent) => {
      if (event.key === 'scripture-account-change') location.reload();
    };
    window.addEventListener('storage', accountChanged);
    const save = async () => {
      if (blocked) throw new Error('Resolve the sync error before leaving this page.');
      if (pending) {
        await pending;
        if (dirty) await save();
        return;
      }
      if (!dirty) return;
      dirty = false;
      setStatus('Saving…');
      pending = accountRequest('/data', 'PUT', {
        accountId,
        revision,
        data: {
          device: JSON.parse(personalGet('open-scripture-device-v1')!),
          learning: JSON.parse(personalGet('open-scripture-learning-v1')!),
        },
      })
        .then((result) => {
          revision = result.revision;
          setStatus('Saved to your account');
        })
        .catch((err) => {
          dirty = true;
          blocked = true;
          setStatus(err.message);
          throw err;
        })
        .finally(() => {
          pending = null;
        });
      await pending;
      if (dirty && !blocked) await save();
    };
    flush.current = save;
    const change = () => {
      dirty = true;
      if (!blocked) setStatus('Saving…');
      clearTimeout(timer);
      timer = setTimeout(() => {
        void save().catch(() => {});
      }, 500);
    };
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty || pending) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    void (async () => {
      try {
        const result = await accountRequest('').catch(() => {
          if (!navigator.onLine) return { user: null };
          throw new Error('Account connection unavailable');
        });
        if (closed) return;
        if (result.user) {
          const snapshot = await accountRequest('/data');
          if (closed) return;
          revision = snapshot.revision;
          accountId = result.user.id;
          accountStorage(snapshot.data.device, snapshot.data.learning);
          setUser(result.user);
          setStatus('Saved to your account');
          window.addEventListener('scripture-device-change', change);
          window.addEventListener('scripture-learning-change', change);
          window.addEventListener('beforeunload', unload);
        }
        setReady(true);
      } catch {
        if (!closed) setStatus('Cannot load your account. Reload to try again.');
      }
    })();
    return () => {
      closed = true;
      window.removeEventListener('storage', accountChanged);
      clearTimeout(timer);
      window.removeEventListener('scripture-device-change', change);
      window.removeEventListener('scripture-learning-change', change);
      window.removeEventListener('beforeunload', unload);
    };
  }, []);
  return (
    <Context.Provider value={{ user, status, flush: () => flush.current() }}>
      {user && status !== 'Saving…' && status !== 'Saved to your account' && (
        <div className="account-sync-error" role="alert">
          {status}{' '}
          <button
            onClick={() => {
              const blob = new Blob(
                [
                  JSON.stringify({
                    device: JSON.parse(personalGet('open-scripture-device-v1')!),
                    learning: JSON.parse(personalGet('open-scripture-learning-v1')!),
                  }),
                ],
                { type: 'application/json' },
              );
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'my-unsaved-reading.json';
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export unsaved data
          </button>{' '}
          <button onClick={() => location.reload()}>Reload saved version</button>
        </div>
      )}
      {ready ? (
        children
      ) : (
        <div className="account-loading" role="status">
          {status || 'Opening your reading room…'}
          {status && <button onClick={() => location.reload()}>Reload</button>}
        </div>
      )}
    </Context.Provider>
  );
}
export function AccountLink() {
  const { user, status, flush } = useAccount();
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [path]);
  async function signout() {
    setBusy(true);
    setError('');
    try {
      await flush();
      await accountRequest('/signout', 'POST');
      try {
        localStorage.setItem('scripture-account-change', String(Date.now()));
      } catch {
        /* Navigation clears the active private state. */
      }
      location.href = '/account/signin';
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return user ? (
    <details
      className="profile-menu"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menu.current) {
          menu.current.open = false;
          menu.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary>
        <span className="profile-avatar" aria-hidden="true">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span>Profile</span>
        <ChevronDown size={13} />
      </summary>
      <section className="profile-popover" aria-label="Account profile">
        <div>
          <strong>{user.name}</strong>
          <p>{user.email ?? `@${user.username}`}</p>
          <small>{status}</small>
        </div>
        <Link href="/study">My dashboard</Link>
        <Link href="/account">Profile &amp; account details</Link>
        <button onClick={signout} disabled={busy}>
          <LogOut size={14} />
          {busy ? 'Signing out…' : 'Sign out'}
        </button>
        {error && <p role="alert">{error}</p>}
      </section>
    </details>
  ) : (
    <div className="account-entry-links">
      <Link href="/account/signin">Sign in</Link>
      <Link className="account-signup-link" href="/account/signup">
        Sign up
      </Link>
    </div>
  );
}
export function ProfileDetails() {
  const { user, status } = useAccount();
  if (!user) return null;
  return (
    <section className="profile-card" aria-label="Your profile details">
      <span className="profile-avatar profile-avatar-large" aria-hidden="true">
        {user.name.slice(0, 1).toUpperCase()}
      </span>
      <div>
        <span className="eyebrow">YOUR PROFILE</span>
        <h2>{user.name}</h2>
        <p>{user.email ?? `@${user.username}`}</p>
        <small>
          {user.google_login ? 'Google account' : 'Email or username · website password'}
        </small>
        <p className="profile-save-state">{status}</p>
      </div>
    </section>
  );
}
export function DashboardAccount() {
  const { user, status, flush } = useAccount();
  const [error, setError] = useState('');
  async function importGuest() {
    try {
      const guest = parseDeviceData(localStorage.getItem('open-scripture-device-v1'));
      const current = parseDeviceData(personalGet('open-scripture-device-v1'));
      const unique = <T,>(items: T[], key: (v: T) => string) =>
        Array.from(new Map(items.map((v) => [key(v), v])).values());
      const learning = JSON.parse(personalGet('open-scripture-learning-v1')!),
        old = JSON.parse(
          localStorage.getItem('open-scripture-learning-v1') || JSON.stringify(emptyLearning),
        );
      const imported = parseAccountData({
        device: {
          ...current,
          bookmarks: unique([...guest.bookmarks, ...current.bookmarks], (v) => v.id),
          conversations: unique([...guest.conversations, ...current.conversations], (v) => v.id),
          readPassages: Array.from(new Set([...guest.readPassages, ...current.readPassages])),
          activity: unique(
            [...guest.activity, ...current.activity],
            (v) => `${v.day}:${v.kind}:${v.resource}`,
          ),
          readingPlaces: unique(
            [...(guest.readingPlaces ?? []), ...(current.readingPlaces ?? [])],
            (v) => v.work,
          ),
        },
        learning: {
          ...learning,
          plan: learning.plan ?? old.plan,
          revision: unique([...old.revision, ...learning.revision], (v: { id: string }) => v.id),
        },
      });
      accountStorage(imported.device, imported.learning);
      await flush();
      setError('Browser data imported. Your existing account entries take priority.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="account-summary">
      {user ? (
        <>
          <ProfileDetails />
          <p>Welcome, {user.name}. Your dashboard syncs across devices.</p>
          <small role="status">{status}</small>
          <details>
            <summary>Bring your guest reading with you</summary>
            <p>
              Import bookmarks, notes, history and learning progress saved in this browser. Account
              entries take priority when they match.
            </p>
            <button className="quiet-button" onClick={importGuest}>
              Import browser data
            </button>
          </details>
          <Link href="/account">Manage account</Link>
        </>
      ) : (
        <p>
          <Link href="/account">Sign in or create an account</Link> to keep your reading across
          devices. Guest activity stays in this browser.
        </p>
      )}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
