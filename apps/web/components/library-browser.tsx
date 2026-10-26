'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Search, Bookmark } from 'lucide-react';
import { traditionRegistry, normalize } from '@core/shared/src/index';
import { useDeviceData } from '../lib/device-store';
import { OfflineDownload } from './offline-download';
export interface LibraryWork {
  id: string;
  slug: string;
  title: string;
  tradition: string;
  tradition_name: string;
  original_lang: string;
  first_ref: string;
  passage_count: number;
  division_count: number;
  languages: string[];
  metadata: Record<string, unknown>;
  display_rules: Record<string, unknown>;
}
export function languageName(code: string) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}
export function LibraryBrowser({ works }: { works: LibraryWork[] }) {
  const [tradition, setTradition] = useState('all'),
    [query, setQuery] = useState(''),
    [language, setLanguage] = useState(''),
    [savedOnly, setSavedOnly] = useState(false);
  const device = useDeviceData();
  const available = traditionRegistry.filter(([id]) => works.some((w) => w.tradition === id));
  const languages = [...new Set(works.flatMap((w) => w.languages))].sort((a, b) =>
    a === 'en' ? -1 : b === 'en' ? 1 : languageName(a).localeCompare(languageName(b)),
  );
  const filtered = works.filter(
    (w) =>
      (tradition === 'all' || w.tradition === tradition) &&
      (!language || w.languages.includes(language)) &&
      (!savedOnly || device.bookmarks.some((b) => b.work === w.slug)) &&
      normalize(
        `${w.title} ${w.tradition_name} ${w.metadata?.group ?? ''} ${w.metadata?.family ?? ''}`,
      ).includes(normalize(query)),
  );
  const groups = [
    ...new Set(
      filtered.map((w) =>
        tradition === 'all'
          ? w.tradition_name
          : String(
              w.metadata?.group ?? (w.slug === 'bhagavad-gita' ? 'The Bhagavad Gita' : 'Scripture'),
            ),
      ),
    ),
  ];
  if (tradition === 'all')
    groups.sort(
      (a, b) => available.findIndex(([, n]) => n === a) - available.findIndex(([, n]) => n === b),
    );
  else if (tradition === 'hinduism')
    groups.sort(
      (a, b) =>
        ['The Bhagavad Gita', 'Epics & Mahākāvya', 'The four Vedas', 'Upanishads'].indexOf(a) -
        ['The Bhagavad Gita', 'Epics & Mahākāvya', 'The four Vedas', 'Upanishads'].indexOf(b),
    );
  const featured = [
    'bhagavad-gita',
    'valmiki-ramayana',
    'rigveda',
    'bible-genesis',
    'bible-psalms',
    'bible-john',
    'tanakh-genesis',
    'tanakh-exodus',
    'tanakh-psalms',
  ];
  const rank = (id: string) => (featured.includes(id) ? featured.indexOf(id) : 999);
  return (
    <div className="page-shell library-shell">
      <div className="library-intro">
        <span className="eyebrow">THE READING ROOM</span>
        <h1>
          Many traditions.
          <br />
          <em>Room for discovery.</em>
        </h1>
        <p>
          Find a familiar passage, or open something new. Real editions, clear sources, and a place
          to keep your thoughts.
        </p>
        <span className="library-total">
          <BookOpen size={15} />
          {works.length} texts · {available.length} traditions · free to read
        </span>
      </div>
      {device.readingPlaces?.[0] && (
        <Link
          className="resume-reading"
          href={`/read/${device.readingPlaces[0].work}/${encodeURIComponent(device.readingPlaces[0].ref.replace(' ', '-'))}`}
        >
          <span>
            <small>CONTINUE READING</small>
            <strong>
              {device.readingPlaces[0].title} · {device.readingPlaces[0].ref}
            </strong>
          </span>
          <ArrowRight size={19} />
        </Link>
      )}
      <nav className="religion-tabs" aria-label="Reading traditions">
        <button aria-pressed={tradition === 'all'} onClick={() => setTradition('all')}>
          All traditions <small>{works.length}</small>
        </button>
        {available.map(([id, name]) => (
          <button key={id} aria-pressed={tradition === id} onClick={() => setTradition(id)}>
            {name}
            <small>{works.filter((w) => w.tradition === id).length}</small>
          </button>
        ))}
      </nav>
      <div className="library-filters">
        <label className="library-search">
          <Search size={17} />
          <input
            type="search"
            aria-label="Find a text"
            placeholder="Find a text, collection or tradition…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Reading language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="">All available languages</option>
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {languageName(lang)}
            </option>
          ))}
        </select>
        <button
          className="quiet-button"
          aria-pressed={savedOnly}
          onClick={() => setSavedOnly(!savedOnly)}
        >
          <Bookmark size={16} />
          Saved
        </button>
      </div>
      <p className="results-count" role="status">
        {filtered.length} text{filtered.length === 1 ? '' : 's'}
        {language ? ` with ${languageName(language)}` : ''} · Editions and language coverage vary by
        text.
      </p>
      {groups.map((group, index) => (
        <section className="library-family" key={group} aria-label={group}>
          <div className="family-heading">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h2>{group}</h2>
            <i />
          </div>
          <div className="library-shelf">
            {filtered
              .filter(
                (w) =>
                  (tradition === 'all'
                    ? w.tradition_name
                    : String(
                        w.metadata?.group ??
                          (w.slug === 'bhagavad-gita' ? 'The Bhagavad Gita' : 'Scripture'),
                      )) === group,
              )
              .sort((a, b) =>
                tradition === 'all'
                  ? rank(a.id) - rank(b.id)
                  : Number(a.metadata?.canonical_order ?? 0) -
                    Number(b.metadata?.canonical_order ?? 0),
              )
              .slice(0, tradition === 'all' && !query && !language && !savedOnly ? 3 : undefined)
              .map((w) => (
                <article className="book-card" key={w.id}>
                  <div className="book-card-top">
                    <span className="eyebrow">
                      {tradition === 'all'
                        ? String(w.metadata?.group ?? w.tradition_name)
                        : String(w.metadata?.family ?? w.tradition_name)}
                    </span>
                    <BookOpen size={20} strokeWidth={1.25} />
                  </div>
                  <h3>
                    <Link href={`/read/${w.slug}`}>{w.title}</Link>
                  </h3>
                  <p>
                    {String(
                      w.metadata?.description ??
                        w.display_rules?.description ??
                        'Sanskrit, Roman transliteration, and attributed human English translations.',
                    )}
                  </p>
                  <div className="book-languages">
                    {w.languages.map((lang) => (
                      <span key={lang}>{languageName(lang)}</span>
                    ))}
                  </div>
                  <div className="book-card-bottom">
                    <span>
                      {w.division_count.toLocaleString()}{' '}
                      {String(w.metadata?.section_label ?? 'chapter').toLowerCase()}
                      {w.division_count === 1 ? '' : 's'}
                      <small>{w.passage_count.toLocaleString()} passages</small>
                    </span>
                    <Link
                      href={`/read/${w.slug}`}
                      aria-label={`Begin reading ${w.title}`}
                      className="book-open"
                    >
                      Begin reading
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                  <details className="book-options">
                    <summary>Edition & offline reading</summary>
                    <p>
                      {String(w.display_rules?.layer ?? 'Primary text')} · {w.tradition_name}. Beta:
                      independent editorial review pending.
                    </p>
                    <OfflineDownload work={w.slug} />
                  </details>
                </article>
              ))}
          </div>
          {tradition === 'all' &&
            !query &&
            !language &&
            !savedOnly &&
            filtered.filter((w) => w.tradition_name === group).length > 3 && (
              <button
                className="text-link browse-tradition"
                onClick={() =>
                  setTradition(filtered.find((w) => w.tradition_name === group)!.tradition)
                }
              >
                Browse all {filtered.filter((w) => w.tradition_name === group).length} {group} texts{' '}
                <ArrowRight size={14} />
              </button>
            )}
        </section>
      ))}
      {!filtered.length && (
        <div className="study-empty">
          <BookOpen size={28} />
          <h2>No texts match these filters.</h2>
          <button
            className="button"
            onClick={() => {
              setQuery('');
              setLanguage('');
              setSavedOnly(false);
              setTradition('all');
            }}
          >
            Reset filters
          </button>
        </div>
      )}
      <p className="library-footnote">
        This library represents the editions listed here, not every scripture or tradition
        worldwide. Human editions remain separate from optional, unreviewed AI study translations.{' '}
        <Link href="/sources">View sources & permissions ↗</Link>
      </p>
    </div>
  );
}
