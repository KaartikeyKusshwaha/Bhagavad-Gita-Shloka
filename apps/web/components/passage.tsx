'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, Flag, ArrowUpRight, Bookmark } from 'lucide-react';
import type { Passage } from '../../../packages/shared/src/index';
import { addActivity } from '@core/shared/src/device-data';
import { useDeviceData, changeDeviceData } from '../lib/device-store';
import { Practice } from './practice';
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
        `${passage.ref}\n${passage.original_text}\n\n${translation?.text ?? ''}\n${translation?.translator ?? ''}\n${passage.source.url}\n${window.location.origin}/read/${passage.work}/${passage.ref.replace(' ', '-')}${typeof rules.copyright_notice === 'string' ? `\n\n${rules.copyright_notice}` : ''}`,
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
      className={`passage-card ${featured ? 'featured' : ''} ${compact ? 'compact-passage' : ''}`}
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
      <section className="scripture-block" aria-label="Primary text" hidden={practiceHidden}>
        <div className="layer-row">
          <span className="layer-label">Primary text · {language}</span>
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
          <a href={passage.source.url} target="_blank" rel="noreferrer">
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
      <section className="translation-block" aria-label="Human translation" hidden={practiceHidden}>
        <div className="layer-row">
          <span className="layer-label">Human translation · English</span>
          {passage.translations.length > 1 && (
            <label className="translation-picker">
              <span className="sr-only">Translation</span>
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {passage.translations.map((t) => (
                  <option key={t.id} value={t.id}>
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
