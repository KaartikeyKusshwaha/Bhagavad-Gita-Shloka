import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ReaderPicker } from './reader-picker';
import { PassageCard } from './passage';
import type { Passage } from '@core/shared/src/index';
interface Division {
  number: number;
  verse_count: number;
  title: string;
}
export function Reader({
  divisions,
  passages,
  chapter,
  context,
}: {
  divisions: Division[];
  passages: Passage[];
  chapter: number;
  context?: { before: Passage[]; after: Passage[] };
}) {
  const first = passages[0],
    current = divisions.find((d) => d.number === chapter);
  return (
    <div className="page-shell">
      <div className="breadcrumbs">
        <Link href="/library">The library</Link>
        <span>/</span>
        <Link href={`/read/${first.work}`}>{first.work_title}</Link>
        <span>/</span>
        <span>Chapter {chapter}</span>
      </div>
      <div className="reader-layout">
        <aside className="chapter-sidebar">
          <span className="eyebrow">{first.tradition_name} · BETA</span>
          <h2>{first.work_title}</h2>
          <p>
            {divisions.length} chapters · {divisions.reduce((n, d) => n + d.verse_count, 0)}{' '}
            passages
          </p>
          <nav className="chapter-nav" aria-label="Chapters">
            {divisions.map((d) => (
              <Link
                key={d.number}
                href={`/read/${first.work}/chapter/${d.number}`}
                aria-current={d.number === chapter ? 'page' : undefined}
              >
                <span>
                  <span className="chapter-number">{String(d.number).padStart(2, '0')}</span>
                  {d.title}
                </span>
                <small>{d.verse_count}</small>
              </Link>
            ))}
          </nav>
          {first.work === 'bhagavad-gita' && (
            <div className="notice">
              <strong>A note on editions</strong>700-verse recension. In chapter 13, the Besant
              translation’s verse number is one higher. Every translation shows its edition
              reference.
            </div>
          )}
        </aside>
        <div className="reader-main">
          <div className="page-heading">
            <span className="eyebrow">
              CHAPTER {String(chapter).padStart(2, '0')} · {current?.verse_count} VERSES
            </span>
            <h1>{current?.title}</h1>
            <p>
              {String(
                first.source.display_rules?.description ??
                  'Original Sanskrit, a human translation, and room to read around the words.',
              )}
            </p>
          </div>
          <ReaderPicker
            key={first.id}
            work={first.work}
            divisions={divisions}
            chapter={chapter}
            verse={passages.length === 1 ? first.verse_number : 0}
          />
          <div className="stack">
            {passages.map((p) => (
              <PassageCard key={p.id} passage={p} />
            ))}
          </div>
          {context && (
            <>
              <nav className="verse-navigation" aria-label="Previous and next passage">
                {context.before.at(-1) ? (
                  <Link
                    href={`/read/${first.work}/${context.before.at(-1)!.ref.replace(' ', '-')}`}
                  >
                    <ArrowLeft size={14} /> {context.before.at(-1)!.ref}
                  </Link>
                ) : (
                  <span />
                )}
                {context.after[0] && (
                  <Link href={`/read/${first.work}/${context.after[0].ref.replace(' ', '-')}`}>
                    {context.after[0].ref} <ArrowRight size={14} />
                  </Link>
                )}
              </nav>
              <details className="context-section">
                <summary>Read the surrounding passages</summary>
                <p className="results-count">
                  Five passages on either side, where available. Read the full chapter for the wider
                  setting.
                </p>
                <div className="context-grid">
                  {[...context.before, first, ...context.after].map((p) => (
                    <Link
                      className="context-item"
                      key={p.id}
                      href={`/read/${p.work}/${p.ref.replace(' ', '-')}`}
                    >
                      <strong>
                        {p.ref}
                        {p.id === first.id ? ' · Current passage' : ''}
                      </strong>
                      <p>{p.translations[0]?.text ?? p.original_text}</p>
                    </Link>
                  ))}
                </div>
              </details>
            </>
          )}
          <Link className="text-link" href="/sources">
            See the full source and license records <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
