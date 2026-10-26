import type { Database } from './index.ts';
const stores = new WeakMap<Database, Map<string, { until: number; promise: Promise<unknown> }>>();
/** Short-lived public catalogue cache. Never stores searches or personal state. */
export function cachedRead<T>(
  db: Database,
  key: string,
  read: () => Promise<T>,
  ttl = 60000,
): Promise<T> {
  if (process.env.NODE_ENV !== 'production') return read();
  let entries = stores.get(db);
  if (!entries) {
    entries = new Map();
    stores.set(db, entries);
  }
  const existing = entries.get(key);
  if (existing && existing.until > Date.now()) return existing.promise as Promise<T>;
  const promise = read().catch((error) => {
    entries.delete(key);
    throw error;
  });
  entries.set(key, { until: Date.now() + ttl, promise });
  return promise;
}
