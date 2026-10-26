'use client';
import { useEffect, useMemo, useState } from 'react';
import { hydrateOffline, type OfflinePack } from '@core/shared/src/offline';
import { normalize } from '@core/shared/src/index';
import { parsePassageReference } from '@core/shared/src/references';
import { listOfflinePacks, removeOfflinePack } from '../lib/offline-store';
import { PassageCard } from './passage';
import { addActivity } from '@core/shared/src/device-data';
import { changeDeviceData } from '../lib/device-store';
export function OfflineReader() {
  const [packs, setPacks] = useState<OfflinePack[]>([]),
    [work, setWork] = useState(''),
    [chapter, setChapter] = useState('all'),
    [input, setInput] = useState(''),
    [find, setFind] = useState(''),
    [page, setPage] = useState(0),
    [error, setError] = useState(''),
    [ready, setReady] = useState(false);
  useEffect(() => {
    void listOfflinePacks()
      .then((data) => {
        setPacks(data);
        setWork(data[0]?.work.slug ?? '');
      })
      .catch(() =>
        setError('Saved editions could not be opened. Check this browser’s storage settings.'),
      )
      .finally(() => setReady(true));
  }, []);
  const pack = packs.find((p) => p.work.slug === work),
    all = useMemo(() => (pack ? hydrateOffline(pack) : []), [pack]),
    reference = find ? parsePassageReference(find, work) : null,
    q = normalize(find),
    matches = all.filter((p) =>
      find
        ? reference
          ? p.ref === reference.ref && p.work === reference.work
          : Boolean(q) &&
            [p.original_text, p.transliteration, ...p.translations.map((t) => t.text)].some(
              (text) => normalize(text).includes(q),
            )
        : chapter === 'all' || p.chapter === Number(chapter),
    );
  const shown = matches.slice(page * 10, page * 10 + 10);
  async function remove() {
    try {
      await removeOfflinePack(work);
      const remaining = packs.filter((p) => p.work.slug !== work);
      setPacks(remaining);
      setWork(remaining[0]?.work.slug ?? '');
      setInput('');
      setFind('');
      setChapter('all');
      setPage(0);
    } catch {
      setError('Could not remove this offline copy.');
    }
  }
  return (
    <div className="page-shell offline-reader" data-ready={ready}>
      <div className="page-heading">
        <span className="eyebrow">YOUR OFFLINE LIBRARY</span>
        <h1>Keep the words close.</h1>
        <p>
          Read and search downloaded editions here, even without a connection. Ask, reports and
          external sources need the internet.
        </p>
      </div>
      {!ready && <p role="status">Opening your saved editions…</p>}
      {error && <p role="alert">{error}</p>}
      {ready && !packs.length && (
        <div className="empty-state">
          <strong>No editions saved yet.</strong>
          <p>Connect to the internet and choose “Save for offline” beside a text in Read.</p>
          <a className="button primary" href="/library">
            Choose a text
          </a>
        </div>
      )}
      {pack && (
        <>
          <div className="offline-controls">
            <label>
              Saved text
              <select
                aria-label="Saved text"
                value={work}
                onChange={(e) => {
                  setWork(e.target.value);
                  setChapter('all');
                  setInput('');
                  setFind('');
                  setPage(0);
                }}
              >
                {packs.map((p) => (
                  <option key={p.work.slug} value={p.work.slug}>
                    {p.work.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Chapter
              <select
                aria-label="Offline chapter"
                value={chapter}
                disabled={Boolean(find)}
                onChange={(e) => {
                  setChapter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All chapters</option>
                {pack.divisions.map((d) => (
                  <option key={d.number} value={d.number}>
                    {d.number} · {d.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setFind(input.trim());
              setPage(0);
              if (normalize(input))
                try {
                  changeDeviceData((data) => addActivity(data, 'search', crypto.randomUUID()));
                } catch {
                  setError(
                    'Search results are available, but activity could not be saved on this device.',
                  );
                }
            }}
          >
            <label className="sr-only" htmlFor="offline-search">
              Search saved text or reference
            </label>
            <input
              id="offline-search"
              value={input}
              maxLength={500}
              onChange={(e) => setInput(e.target.value)}
              placeholder="An exact phrase or a reference…"
            />
            <button type="submit">Search offline</button>
          </form>
          <p className="results-count">
            {matches.length} passage{matches.length === 1 ? '' : 's'} ·{' '}
            {find ? 'exact text/reference search' : 'reading'} · Saved{' '}
            {new Date(pack.downloadedAt).toLocaleDateString()}
          </p>
          {find && (
            <button
              className="quiet-button"
              onClick={() => {
                setFind('');
                setInput('');
                setPage(0);
              }}
            >
              Clear search
            </button>
          )}
          <div className="stack">
            {shown.map((p) => (
              <PassageCard key={p.id} passage={p} />
            ))}
          </div>
          {!matches.length && (
            <p>No exact match in this downloaded edition. Try a shorter phrase or a reference.</p>
          )}
          <nav className="offline-pages" aria-label="Offline reading pages">
            <button className="button secondary" disabled={!page} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>
              Page {page + 1} of {Math.max(1, Math.ceil(matches.length / 10))}
            </span>
            <button
              className="button secondary"
              disabled={(page + 1) * 10 >= matches.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </nav>
          <details className="offline-data-controls">
            <summary>About this download & device controls</summary>
            <p>
              Text, translations and source licenses are saved in this browser. No audio is
              included. Reconnect and update the copy in Read to receive changes. Clearing site
              storage removes downloads.
            </p>
            <button className="quiet-button" onClick={remove}>
              Remove {pack.work.title} offline copy
            </button>
          </details>
        </>
      )}
    </div>
  );
}
