import Link from 'next/link';
import { getDatabase } from '@core/db/src/index';
import { getSourceList } from '@core/db/src/queries';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sources & licenses' };
export default async function Sources() {
  const sources = await getSourceList(await getDatabase());
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">SHOWING OUR WORK</span>
        <h1>
          Every text has a history.
          <br />
          <em>Every source has a record.</em>
        </h1>
        <p>
          Texts are imported into our database and served here. Reading and verification never
          depend on a live third-party scripture API.
        </p>
      </div>
      <div className="stack">
        {sources.map((source) => (
          <article className="source-card" key={String(source.id)}>
            <span className="eyebrow">
              {String(source.status)} · {Number(source.passage_count)} PASSAGES
            </span>
            <h2>{String(source.name)}</h2>
            <p>{String(source.attribution)}</p>
            <p>
              <strong>License:</strong>{' '}
              <a href={String(source.license_url)} target="_blank" rel="noreferrer">
                {String(source.license)}
              </a>
            </p>
            <p>
              <a className="text-link" href={String(source.url)} target="_blank" rel="noreferrer">
                Open the source ↗
              </a>{' '}
              · Retrieved {String(source.retrieved_at)} ·{' '}
              {source.commercial_ok
                ? 'Commercial reuse permitted under the stated terms'
                : 'Non-commercial use only'}
            </p>
            <p>
              <strong>Display rules:</strong>{' '}
              {Object.entries(source.display_rules as Record<string, unknown>)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' · ')}
            </p>
            <p>
              Imported bundle SHA-256: <code>{String(source.checksum)}</code>
            </p>
            <Link className="text-link" href="/report?passage=bg.2.47">
              Report a text or licensing issue →
            </Link>
          </article>
        ))}
      </div>
      <div className="notice">
        <strong>Known review gaps</strong>No named tradition reviewer has signed off this
        collection. Independent printed-edition canonical samples and human search/verification
        evaluation sets are pending. Beta status does not imply scholarly endorsement.
      </div>
      <div className="prose">
        <h2>What belongs to whom</h2>
        <p>
          Application code is AGPL-3.0. Our interface strings and original notes are CC BY-SA 4.0.
          Third-party texts retain their own terms. The Sanskrit transcription and the imported
          structure require attribution and share-alike distribution. Annie Besant’s 1922 text is
          public domain in the United States and jurisdictions with life-plus-92-years or shorter
          terms; the Wikisource transcription is attributed under CC BY-SA.
        </p>
        <p>
          The old app’s image and unlicensed API translations are kept out of the published
          collection. <Link href="/api">Developers can access the attributed API.</Link>
        </p>
      </div>
    </div>
  );
}
