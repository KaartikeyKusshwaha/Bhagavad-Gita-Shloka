import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
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
          Each work enters the reading room with a source, a license, and a clear account of its
          limits. Traditions without a named advisory reviewer remain beta.
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
              Original Sanskrit with Roman transliteration and Annie Besant’s 1922 English
              translation. Every verse includes its citation and source license.
            </p>
            <span className="library-count">
              18 chapters · {String(work.passage_count)} passages · 1 translation
            </span>
            <Link href={`/read/${String(work.slug)}`} className="button primary">
              Begin reading <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </div>
      <div className="notice">
        <strong>Next collections, after source and reviewer checks</strong>Quran, Bible, Guru Granth
        Sahib, selected Sefaria texts, Dhammapada and suttas, Tao Te Ching, and Analects. A planned
        collection is not included in search or verification until its texts are approved.
      </div>
    </div>
  );
}
