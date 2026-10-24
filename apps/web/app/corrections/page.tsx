import { getDatabase } from '@core/db/src/index';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Public corrections' };
export default async function Corrections() {
  const db = await getDatabase(),
    rows = (
      await db.query(
        'SELECT c.*,p.ref FROM corrections c JOIN published_passages p ON p.id=c.passage_id ORDER BY c.date DESC LIMIT 100',
      )
    ).rows;
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">A VISIBLE RECORD</span>
        <h1>A library is allowed to learn.</h1>
        <p>
          Corrections appear here after approval by a named reviewer. The original wording,
          replacement, reason, and reviewer remain traceable.
        </p>
      </div>
      {rows.length ? (
        <div className="stack">
          {rows.map((c) => (
            <article className="source-card" key={String(c.id)}>
              <h2>{String(c.ref)}</h2>
              <p>
                Approved by {String(c.approved_by)} ·{' '}
                {new Date(String(c.date)).toLocaleDateString('en-IN')}
              </p>
              <p>Before: {String((c.before as { text: string }).text)}</p>
              <p>After: {String((c.after as { text: string }).text)}</p>
              <p>Report {String(c.report_id)}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No published corrections yet.</strong>Reports are accepted, but no named tradition
          reviewer is currently appointed. Corrections cannot be published until that reviewer gate
          is met.
        </div>
      )}
    </div>
  );
}
