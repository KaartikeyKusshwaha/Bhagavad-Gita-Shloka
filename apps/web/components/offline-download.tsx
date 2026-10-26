'use client';
import { useEffect, useState } from 'react';
import { listOfflinePacks, saveOfflinePack, prepareOfflineShell } from '../lib/offline-store';
export function OfflineDownload({ work }: { work: string }) {
  const [saved, setSaved] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState('');
  useEffect(() => {
    void listOfflinePacks()
      .then((packs) => setSaved(packs.some((p) => p.work.slug === work)))
      .catch(() => {});
  }, [work]);
  async function download() {
    setPending(true);
    setMessage('Preparing the offline reader and downloading this edition…');
    try {
      const response = await fetch(`/v1/works/${encodeURIComponent(work)}/offline`, {
        signal: AbortSignal.timeout(60000),
      });
      if (!response.ok) throw new Error('Could not download this edition. Try again online.');
      const pack = await response.json();
      await prepareOfflineShell();
      await saveOfflinePack(pack);
      setSaved(true);
      setMessage(
        'Saved for offline reading and exact search. Browser storage may be cleared by your device.',
      );
    } catch {
      setMessage(
        'Offline download could not finish. Check your connection, browser storage and available space, then try again.',
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="offline-download">
      <button className="quiet-button" disabled={pending} onClick={download}>
        {pending ? 'Saving offline…' : saved ? 'Update offline copy' : 'Save for offline'}
      </button>
      {saved && (
        <a className="text-link" href="/offline">
          Open offline library →
        </a>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
