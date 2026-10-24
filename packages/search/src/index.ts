import type { Database } from '../../db/src/index.ts';
import { hydrate, getPassage } from '../../db/src/queries.ts';
import { normalize, type SearchHit } from '../../shared/src/index.ts';
export interface SearchOptions {
  work?: string;
  tradition?: string;
  lang?: string;
  limit?: number;
  mode?: 'all' | 'exact' | 'fuzzy' | 'semantic';
}
export async function searchPassages(
  db: Database,
  query: string,
  options: SearchOptions = {},
): Promise<SearchHit[]> {
  const q = normalize(query);
  if (q.length < 2) return [];
  const ref = query
    .trim()
    .match(/^(?:(?:bg|gita|bhagavad[ -]gita)\s*[-:]?\s*)?(\d{1,2})[.:](\d{1,3})$/i);
  if (ref) {
    const p = await getPassage(
      db,
      options.work ?? 'bhagavad-gita',
      `BG ${Number(ref[1])}.${Number(ref[2])}`,
    );
    return p && (!options.tradition || p.tradition === options.tradition)
      ? [{ passage: p, score: 1, match_type: 'reference' }]
      : [];
  }
  if (options.mode === 'semantic') throw new Error('SEMANTIC_UNAVAILABLE');
  const work = options.work ?? null,
    tradition = options.tradition ?? null;
  const escaped = q.replace(/[\\%_]/g, '\\$&');
  const rows = (
    await db.query(
      `WITH candidates AS (
 SELECT p.id,CASE WHEN p.text_norm LIKE $1 ESCAPE '\\' OR p.transliteration_norm LIKE $1 ESCAPE '\\' THEN 1.0 ELSE 0.0 END AS exact_score,
 GREATEST(similarity(p.text_norm,$2),word_similarity($2,p.text_norm),similarity(p.transliteration_norm,$2),word_similarity($2,p.transliteration_norm),COALESCE((SELECT MAX(GREATEST(similarity(tr.text_norm,$2),word_similarity($2,tr.text_norm))) FROM published_translations tr WHERE tr.passage_id=p.id AND ($5::text IS NULL OR tr.lang=$5)),0)) AS fuzzy_score,
 EXISTS(SELECT 1 FROM published_translations tr WHERE tr.passage_id=p.id AND tr.text_norm LIKE $1 ESCAPE '\\' AND ($5::text IS NULL OR tr.lang=$5)) AS translated_exact
 FROM published_passages p JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id WHERE ($3::text IS NULL OR w.slug=$3) AND ($4::text IS NULL OR t.slug=$4)
 ) SELECT p.*,w.slug AS work,w.title AS work_title,t.slug AS tradition,t.name AS tradition_name,d.number AS chapter,to_jsonb(s) AS source,c.exact_score,c.fuzzy_score,c.translated_exact
 FROM candidates c JOIN published_passages p ON p.id=c.id JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id JOIN divisions d ON d.id=p.division_id JOIN sources s ON s.id=p.source_id
 WHERE (c.exact_score=1 OR c.translated_exact OR ($6<>'exact' AND c.fuzzy_score>=0.35))
 ORDER BY (c.exact_score=1 OR c.translated_exact) DESC,c.fuzzy_score DESC,p.ordinal LIMIT $7`,
      [
        `%${escaped}%`,
        q,
        work,
        tradition,
        options.lang ?? null,
        options.mode ?? 'all',
        Math.min(options.limit ?? 10, 50),
      ],
    )
  ).rows;
  const passages = await hydrate(db, rows);
  return passages.map((p, i) => ({
    passage: p,
    score: rows[i].exact_score === 1 || rows[i].translated_exact ? 1 : Number(rows[i].fuzzy_score),
    match_type: rows[i].exact_score === 1 || rows[i].translated_exact ? 'exact' : 'fuzzy',
  }));
}
export function reciprocalRankFusion(lists: { id: string }[][], k = 60) {
  const scores = new Map<string, number>();
  for (const list of lists)
    list.forEach((hit, index) =>
      scores.set(hit.id, (scores.get(hit.id) ?? 0) + 1 / (k + index + 1)),
    );
  return [...scores].sort((a, b) => b[1] - a[1]).map(([id, score]) => ({ id, score }));
}
