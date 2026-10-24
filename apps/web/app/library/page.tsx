import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
import { readingSources } from '@core/shared/src/reading-sources';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'The library' };
export default async function Library() {
  const works = await getWorks(await getDatabase());
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">THE COLLECTION</span>
        <h1>A library that grows with care.</h1>
        <p>
          Choose a text to begin. Each edition shows its languages and sources. The collection
          remains a beta pending independent editorial review.
        </p>
      </div>
      <div className="results-grid">
        {works.map((work) => (
          <article className="library-card" key={String(work.id)}>
            <span className="eyebrow">
              {String(work.tradition_name)} <span className="beta-chip">BETA</span>
            </span>
            <h2>{String(work.title)}</h2>
            <p>
              {String(
                (work.display_rules as Record<string, unknown>)?.description ??
                  'Original Sanskrit with Roman transliteration and Annie Besant’s 1922 English translation.',
              )}
            </p>
            <span className="library-count">
              {String(work.division_count)} chapters · {String(work.passage_count)} passages
            </span>
            <Link
              href={`/read/${String(work.slug)}`}
              className="button primary"
              aria-label={`Begin reading ${String(work.title)}`}
            >
              Begin reading <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
      <details className="hosted-library">
        <summary>More traditions · free reading on source websites</summary>
        <p>
          These collections open at their hosts. Their text is not yet searchable or downloadable
          inside this website.
        </p>
        <div className="hosted-sources">
          {readingSources
            .filter((s) => s.method !== 'integrated')
            .map((source) => (
              <a key={source.tradition} href={source.url} target="_blank" rel="noreferrer">
                <strong>{source.name}</strong>
                <span>
                  {source.collection} · {source.source_name} ↗
                </span>
              </a>
            ))}
        </div>
      </details>
    </div>
  );
}
