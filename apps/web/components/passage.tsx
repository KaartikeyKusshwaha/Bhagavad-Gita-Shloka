'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Flag, ArrowUpRight, Bookmark } from 'lucide-react';
import type { Passage } from '../../../packages/shared/src/index';
import { addActivity } from '@core/shared/src/device-data';
import { useDeviceData, changeDeviceData } from '../lib/device-store';
import { Practice } from './practice';
import { HumanAudio } from './human-audio';
import { SharePassage } from './share-passage';
import { StudyTranslation } from './study-translation';
import { languageName } from './library-browser';
export function PassageCard({
  passage,
  featured = false,
  compact = false,
}: {
  passage: Passage;
  featured?: boolean;
  compact?: boolean;
}) {
  const [script, setScript] = useState<'original' | 'roman'>('original'),
    [copied, setCopied] = useState(false),
    [notice, setNotice] = useState('');
  const [practiceHidden, setPracticeHidden] = useState(false);
  const device = useDeviceData(),
    saved = device.bookmarks.some((b) => b.id === passage.id),
    read = device.readPassages.includes(passage.id);
  const [selected, setSelected] = useState(passage.translations[0]?.id ?? '');
  const bookmarkData = device.bookmarks.find((b) => b.id === passage.id);
  function updateBookmark(update: { color?: 'gold' | 'sage' | 'rose' | 'blue'; note?: string }) {
    try {
      changeDeviceData((state) => ({
        ...state,
        bookmarks: state.bookmarks.map((b) => (b.id === passage.id ? { ...b, ...update } : b)),
      }));
      setNotice('Bookmark updated on this device.');
    } catch {
      setNotice('Device storage is unavailable.');
    }
  }
  const translation =
    passage.translations.find((t) => t.id === selected) ?? passage.translations[0];
  const rules = passage.source.display_rules ?? {},
    language = String(rules.language ?? 'Sanskrit'),
    lang = String(rules.lang ?? 'sa'),
    rtl = rules.direction === 'rtl',
    hasRoman = Boolean(passage.transliteration);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        [
          passage.ref,
          passage.original_text,
          ...(translation
            ? [
                translation.text,
                `${translation.translator} · ${String(translation.source_ref ?? passage.ref)}`,
                translation.source.attribution,
                `${translation.source.license} · ${translation.source.url}`,
              ]
            : []),
          passage.source.attribution,
          `${passage.source.license} · ${passage.source.url}`,
          `${window.location.origin}/read/${passage.work}/${passage.ref.replace(' ', '-')}`,
          ...(typeof rules.copyright_notice === 'string' ? [rules.copyright_notice] : []),
        ].join('\n\n'),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice('Copy is unavailable in this browser. Select the passage text to copy it.');
    }
  }
  function bookmark() {
    try {
      changeDeviceData((state) => ({
        ...state,
        bookmarks: state.bookmarks.some((b) => b.id === passage.id)
          ? state.bookmarks.filter((b) => b.id !== passage.id)
          : [
              {
                id: passage.id,
                ref: passage.ref,
                work: passage.work,
                title: passage.work_title,
                preview: (translation?.text ?? passage.original_text).slice(0, 500),
                savedAt: new Date().toISOString(),
              },
              ...state.bookmarks,
            ].slice(0, 2000),
      }));
      setNotice(saved ? 'Bookmark removed from this device.' : 'Bookmark saved on this device.');
    } catch {
      setNotice('Device storage is unavailable.');
    }
  }
  function markRead() {
    try {
      changeDeviceData((state) =>
        addActivity(
          {
            ...state,
            readingPlaces: [
              {
                work: passage.work,
                ref: passage.ref,
                title: passage.work_title,
                at: new Date().toISOString(),
              },
              ...(state.readingPlaces ?? []).filter((p) => p.work !== passage.work),
            ].slice(0, 100),
            readPassages: state.readPassages.includes(passage.id)
              ? state.readPassages
              : [...state.readPassages, passage.id],
          },
          'read',
          passage.id,
        ),
      );
      setNotice('Passage marked read. Your Study calendar has been updated.');
    } catch {
      setNotice('Could not save reading progress on this device.');
    }
  }
  return (
    <article
      className={`passage-card ${featured ? 'featured' : ''} ${compact ? 'compact-passage' : ''} ${saved ? `marked-${bookmarkData?.color ?? 'gold'}` : ''}`}
      aria-label={passage.ref}
    >
      <div className="passage-top">
        <div>
          <span className="eyebrow">{featured ? 'A place to begin' : passage.work_title}</span>
          <Link
            className="citation"
            href={`/read/${passage.work}/${passage.ref.replace(' ', '-')}`}
          >
            {passage.ref}
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="passage-tools">
          <SharePassage passage={passage} translationId={translation?.id} />
          <button
            onClick={bookmark}
            aria-label={saved ? 'Remove bookmark' : 'Bookmark on this device'}
            aria-pressed={saved}
          >
            <Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />
          </button>
          <button onClick={copy} aria-label="Copy passage with attribution">
            {copied ? <Check size={17} /> : <Copy size={17} />}
          </button>
        </div>
      </div>
      {String(passage.metadata?.locator ?? '').startsWith('Platform') && (
        <p className="passage-locator">
          {String(passage.metadata?.source_ref ?? '')} · Reading-block locator, not a canonical
          verse number.{' '}
          <a
            href={String(passage.metadata?.source_url ?? passage.source.url)}
            target="_blank"
            rel="noreferrer"
          >
            Check source numbering ↗
          </a>
        </p>
      )}
      <section
        className="scripture-block"
        role={compact ? 'group' : undefined}
        aria-label={`${compact ? 'Preview primary text' : 'Primary text'} · ${passage.ref}`}
        hidden={practiceHidden}
      >
        <div className="layer-row">
          <span className="layer-label">
            {rules.layer === 'Human translation' ? 'Human edition' : 'Primary text'} · {language}
          </span>
          {hasRoman && (
            <div className="script-toggle" role="group" aria-label="Script">
              <button aria-pressed={script === 'original'} onClick={() => setScript('original')}>
                देव
              </button>
              <button aria-pressed={script === 'roman'} onClick={() => setScript('roman')}>
                Aa
              </button>
            </div>
          )}
        </div>
        <p
          className={
            script === 'roman'
              ? 'roman'
              : lang === 'sa'
                ? 'sanskrit'
                : rtl
                  ? 'arabic-text'
                  : 'primary-latin'
          }
          lang={script === 'original' ? lang : `${lang}-Latn`}
          dir={rtl && script === 'original' ? 'rtl' : 'ltr'}
        >
          {script === 'original' ? passage.original_text : passage.transliteration}
        </p>
        <p className="source-inline">
          <a
            href={String(passage.metadata?.source_url ?? passage.source.url)}
            target="_blank"
            rel="noreferrer"
          >
            {passage.source.name}
          </a>
          <span> · {passage.source.license}</span>
        </p>
      </section>
      {typeof rules.copyright_notice === 'string' && (
        <details className="text-copyright">
          <summary>Tanzil text notice</summary>
          <pre>{rules.copyright_notice}</pre>
        </details>
      )}
      {(translation || lang !== 'en') && (
        <section
          className="translation-block"
          role={compact ? 'group' : undefined}
          aria-label={`${compact ? 'Preview human translation' : 'Human translation'} · ${passage.ref}`}
          hidden={practiceHidden}
        >
          <div className="layer-row">
            <span className="layer-label">
              Human translation · {languageName(translation?.lang ?? 'en')}
            </span>
            {passage.translations.length > 1 && (
              <label className="translation-picker">
                <span className="sr-only">Translation</span>
                <select
                  aria-label="Translation"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {passage.translations.map((t) => (
                    <option key={t.id} value={t.id}>
                      {new Set(passage.translations.map((item) => item.lang)).size > 1
                        ? `${languageName(t.lang)} · `
                        : ''}
                      {t.translator}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {translation ? (
            <>
              <p className="translation-text" lang={translation.lang}>
                {translation.text}
              </p>
              <p className="translation-credit">
                {translation.translator}
                <span> · {String(translation.source_ref ?? passage.ref)}</span>
              </p>
              {translation.is_machine && <p>Machine translation, may contain errors</p>}
              <p className="source-inline">
                <a href={translation.source.url} target="_blank" rel="noreferrer">
                  View translation source
                </a>{' '}
                · {translation.source.license}
              </p>
            </>
          ) : (
            <p>No approved human translation is available for this passage.</p>
          )}
        </section>
      )}
      {!compact && <StudyTranslation passage={passage} />}
      {!compact && saved && (
        <details className="bookmark-notes">
          <summary>Bookmark colour & private note</summary>
          <div className="marker-colors" role="group" aria-label="Bookmark colour">
            {(['gold', 'sage', 'rose', 'blue'] as const).map((color) => (
              <button
                key={color}
                className={`marker-${color}`}
                aria-label={`${color} bookmark`}
                aria-pressed={(bookmarkData?.color ?? 'gold') === color}
                onClick={() => updateBookmark({ color })}
              >
                {(bookmarkData?.color ?? 'gold') === color ? <Check size={15} /> : null}
              </button>
            ))}
          </div>
          <label htmlFor={`${passage.id}-note`}>My note</label>
          <textarea
            id={`${passage.id}-note`}
            key={`${passage.id}-${bookmarkData?.savedAt}`}
            defaultValue={bookmarkData?.note ?? ''}
            maxLength={3000}
            placeholder="A thought to return to…"
            onChange={(e) => updateBookmark({ note: e.target.value })}
          />
          <small>Saved automatically on this device. Never sent to the AI.</small>
        </details>
      )}
      {!compact && passage.translations.length > 1 && (
        <details className="translation-comparison" hidden={practiceHidden}>
          <summary>Compare human translations</summary>
          <p className="comparison-note">
            Different translators make different choices. Combined verse ranges retain their source
            labels.
          </p>
          <div className="comparison-grid">
            {passage.translations.map((item) => (
              <section key={item.id} aria-label={`${item.translator} · ${passage.ref}`}>
                <h2>{item.translator}</h2>
                <p className="translation-text" lang={item.lang}>
                  {item.text}
                </p>
                <p className="translation-credit">{String(item.source_ref ?? passage.ref)}</p>
                <p className="source-inline">
                  <a href={item.source.url} target="_blank" rel="noreferrer">
                    Translation source
                  </a>{' '}
                  · {item.source.license}
                </p>
              </section>
            ))}
          </div>
        </details>
      )}
      {!compact && passage.audio && <HumanAudio tracks={passage.audio} />}
      {!compact && <Practice key={passage.id} passage={passage} onHide={setPracticeHidden} />}
      {!compact && (
        <div className="passage-bottom">
          <button className="mark-read-button" onClick={markRead} aria-pressed={read}>
            <Check size={14} />
            {read ? 'Read · saved to Study' : 'Mark as read'}
          </button>
          <Link href={`/report?passage=${encodeURIComponent(passage.id)}`}>
            <Flag size={13} /> Report an error
          </Link>
        </div>
      )}
      <span className="sr-only" role="status">
        {notice}
        {copied ? 'Copied with attribution.' : ''}
      </span>
    </article>
  );
}
