import Link from 'next/link';
import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
import { searchPassages } from '@core/search/src/index';
import { routeSafety } from '@core/llm/src/guardrails';
import { PassageCard } from '../../components/passage';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search the collection' };
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string; work?: string; lang?: string }>;
}) {
  const params = await searchParams,
    q = (params.q ?? '').slice(0, 500),
    mode = params.mode === 'exact' ? 'exact' : 'all';
  const safety = routeSafety(q),
    db = await getDatabase();
  const works = await getWorks(db),
    searchedWorks = works.filter((w) => !params.work || w.slug === params.work);
  const hits =
    q.length >= 2 && safety.kind === 'ordinary'
      ? await searchPassages(db, q, {
          mode,
          work: params.work || undefined,
          lang: params.lang || undefined,
          limit: 10,
        })
      : [];
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">THE WORDS YOU’RE LOOKING FOR</span>
        <h1>Find your way back to the text.</h1>
        <p>
          A reference, an original-language phrase, a Roman spelling, or words from a human
          translation. Every result leads back to an attributed passage.
        </p>
      </div>
      <form action="/search">
        <div className="search-form">
          <label className="sr-only" htmlFor="query">
            Search the collection
          </label>
          <input
            id="query"
            name="q"
            defaultValue={q}
            placeholder="Try BG 2.47, karma, or action only"
            minLength={2}
            maxLength={500}
            required
          />
          <button type="submit" aria-label="Search">
            →
          </button>
        </div>
        <div className="filter-row">
          <label>
            Collection
            <select name="work" defaultValue={params.work ?? ''}>
              <option value="">All published works</option>
              {works.map((w) => (
                <option key={String(w.slug)} value={String(w.slug)}>
                  {String(w.title)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Translation language
            <select name="lang" defaultValue={params.lang ?? ''}>
              <option value="">All available</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            Matching
            <select name="mode" defaultValue={mode}>
              <option value="all">Exact + fuzzy</option>
              <option value="exact">Exact phrase</option>
            </select>
          </label>
          <button className="button outline" type="submit">
            Apply & search
          </button>
        </div>
      </form>
      {safety.kind !== 'ordinary' ? (
        <div className="notice" role="alert">
          <strong>
            {safety.kind === 'distress' ? 'Your safety comes first' : 'A note before searching'}
          </strong>
          {safety.message}
        </div>
      ) : q.length >= 2 ? (
        <>
          <p className="results-count">
            {hits.length
              ? `${hits.length} result${hits.length === 1 ? '' : 's'} for “${q}”`
              : `No results for “${q}”`}{' '}
            · {new Set(searchedWorks.map((w) => w.tradition)).size} traditions,{' '}
            {searchedWorks.length} works,{' '}
            {searchedWorks.reduce((n, w) => n + Number(w.passage_count), 0)} passages searched
          </p>
          {hits.length ? (
            <div className="results-grid">
              {hits.map((hit) => (
                <div key={hit.passage.id}>
                  <span className="match-tag">
                    {hit.match_type === 'reference'
                      ? 'Reference match'
                      : `${hit.match_type} wording match`}
                  </span>
                  <PassageCard passage={hit.passage} compact />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>Not in this collection yet.</strong>Try a shorter phrase, a different
              spelling, or a reference such as BG 2.47. A missing result does not mean a quotation
              is false.
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <strong>Start with a few words.</strong>
          <p>
            Try <Link href="/search?q=BG+2.47">BG 2.47</Link>,{' '}
            <Link href="/search?q=कर्म">कर्म</Link>, or <Link href="/search?q=fruits">fruits</Link>.
          </p>
        </div>
      )}
      <div className="notice">
        Exact and fuzzy text search are available. Semantic meaning search and Hindi translations
        await their model, source, and review gates. Roman Sanskrit search is experimental.
      </div>
    </div>
  );
}
