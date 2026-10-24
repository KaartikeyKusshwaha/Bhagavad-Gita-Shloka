import type { Database } from '../../db/src/index.ts';
import { hydrate } from '../../db/src/queries.ts';
import { readingThemes } from '../../shared/src/themes.ts';
import { normalize, type SearchHit } from '../../shared/src/index.ts';
export async function browseTheme(db: Database, slug: string, work?: string) {
  const theme = readingThemes.find((t) => t.slug === slug);
  if (!theme) return null;
  const rows = (
    await db.query(
      `WITH keywords AS (SELECT * FROM unnest($1::text[]) WITH ORDINALITY AS k(needle,priority)), documents AS (
    SELECT p.id,p.work_id,p.ordinal,w.tradition_id,k.priority FROM keywords k JOIN published_passages p ON p.text_norm LIKE ('%'||k.needle||'%') JOIN works w ON w.id=p.work_id WHERE ($2::text IS NULL OR w.slug=$2)
    UNION ALL SELECT p.id,p.work_id,p.ordinal,w.tradition_id,k.priority FROM keywords k JOIN published_passages p ON p.transliteration_norm LIKE ('%'||k.needle||'%') JOIN works w ON w.id=p.work_id WHERE p.transliteration_norm<>'' AND ($2::text IS NULL OR w.slug=$2)
    UNION ALL SELECT p.id,p.work_id,p.ordinal,w.tradition_id,k.priority FROM keywords k JOIN published_translations tr ON tr.text_norm LIKE ('%'||k.needle||'%') JOIN published_passages p ON p.id=tr.passage_id JOIN works w ON w.id=p.work_id WHERE ($2::text IS NULL OR w.slug=$2)
  ), matches AS (SELECT id,work_id,ordinal,tradition_id,min(priority) AS priority FROM documents GROUP BY id,work_id,ordinal,tradition_id), ranked AS (
    SELECT *,row_number() OVER(PARTITION BY tradition_id ORDER BY priority,work_id,ordinal) AS position FROM matches
  )
  SELECT p.*,w.slug AS work,w.title AS work_title,t.slug AS tradition,t.name AS tradition_name,
  d.number AS chapter,to_jsonb(s) AS source FROM ranked r JOIN published_passages p ON p.id=r.id
  JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id
  JOIN divisions d ON d.id=p.division_id JOIN sources s ON s.id=p.source_id
  WHERE r.position<=2 ORDER BY r.position,t.name,w.title LIMIT 28`,
      [theme.queries.map(normalize), work ?? null],
    )
  ).rows;
  const hits: SearchHit[] = (await hydrate(db, rows)).map((passage) => ({
    passage,
    score: 1,
    match_type: 'exact',
  }));
  return {
    hits,
    note: `${theme.name}: an editorial keyword trail through the available texts. These are wording matches, not a claim that traditions use these ideas in the same way. Read each passage in its own context.`,
  };
}
