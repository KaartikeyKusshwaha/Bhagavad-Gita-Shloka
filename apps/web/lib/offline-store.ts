'use client';
import { parseOfflinePack } from '@core/shared/src/offline';
const DATABASE = 'open-scripture-offline',
  STORE = 'works';
function operation<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(DATABASE, 1);
    opening.onupgradeneeded = () =>
      opening.result.createObjectStore(STORE, { keyPath: 'work.slug' });
    opening.onerror = () => reject(new Error('Offline storage is unavailable.'));
    opening.onsuccess = () => {
      const db = opening.result,
        tx = db.transaction(STORE, mode);
      let value: T;
      const request = action(tx.objectStore(STORE));
      request.onsuccess = () => {
        value = request.result;
      };
      tx.oncomplete = () => {
        db.close();
        resolve(value);
      };
      tx.onerror = () => {
        db.close();
        reject(new Error('Offline storage failed. Check available device space.'));
      };
      tx.onabort = () => {
        db.close();
        reject(new Error('Offline storage was interrupted.'));
      };
    };
  });
}
export async function saveOfflinePack(input: unknown) {
  const pack = parseOfflinePack(input);
  await operation('readwrite', (s) => s.put(pack));
  return pack;
}
export async function listOfflinePacks() {
  return (await operation<unknown[]>('readonly', (s) => s.getAll())).map(parseOfflinePack);
}
export async function removeOfflinePack(slug: string) {
  await operation('readwrite', (s) => s.delete(slug));
}
export async function prepareOfflineShell() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext)
    throw new Error('Offline reading needs HTTPS or localhost in a supported browser.');
  const registration = await navigator.serviceWorker.register('/sw.js');
  const worker = registration.installing ?? registration.waiting ?? registration.active;
  if (!worker) throw new Error('The offline reader could not be installed.');
  if (worker.state === 'activated') return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Offline installation timed out. Try again online.')),
      90000,
    );
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        clearTimeout(timer);
        resolve();
      } else if (worker.state === 'redundant') {
        clearTimeout(timer);
        reject(new Error('Offline reader installation failed. Refresh online and try again.'));
      }
    });
  });
}
