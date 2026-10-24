import type { Database } from '../../db/src/index.ts';
import { hydrate, getPassage } from '../../db/src/queries.ts';
import { normalize, type SearchHit } from '../../shared/src/index.ts';
import { parsePassageReference } from '../../shared/src/references.ts';
import { semanticSearch } from './semantic.ts';
import { modelConfigured } from '../../llm/src/provider.ts';
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
  const ref = parsePassageReference(query, options.work);
  if (ref) {
    if (options.work && options.work !== ref.work) return [];
    const p = await getPassage(db, ref.work, ref.ref);
    return p && (!options.tradition || p.tradition === options.tradition)
      ? [{ passage: p, score: 1, match_type: 'reference' }]
      : [];
  }
  if (options.mode === 'semantic') return semanticSearch(db, query, options);
  const work = options.work ?? null,
    tradition = options.tradition ?? null;
  const escaped = q.replace(/[\\%_]/g, '\\$&');
  const limit = Math.max(1, Math.min(options.limit ?? 10, 50));
  const exact = (
    await db.query(
      `SELECT p.*,w.slug AS work,w.title AS work_title,t.slug AS tradition,t.name AS tradition_name,d.number AS chapter,to_jsonb(s) AS source
     FROM published_passages p JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id JOIN divisions d ON d.id=p.division_id JOIN sources s ON s.id=p.source_id
     WHERE ($3::text IS NULL OR w.slug=$3) AND ($4::text IS NULL OR t.slug=$4)
     AND (p.text_norm LIKE $1 ESCAPE '\\' OR p.transliteration_norm LIKE $1 ESCAPE '\\'
       OR EXISTS(SELECT 1 FROM published_translations tr WHERE tr.passage_id=p.id AND tr.text_norm LIKE $1 ESCAPE '\\' AND ($2::text IS NULL OR tr.lang=$2)))
     ORDER BY w.title,p.ordinal LIMIT $5`,
      [`%${escaped}%`, options.lang ?? null, work, tradition, limit],
    )
  ).rows;
  if (exact.length)
    return (await hydrate(db, exact)).map((p) => ({
      passage: p,
      score: 1,
      match_type: 'exact' as const,
    }));
  if (options.mode === 'exact') return [];
  const scripts = [
    [/\p{Script=Latin}/u, 'Latin'],
    [/\p{Script=Devanagari}/u, 'Devanagari'],
    [/\p{Script=Arabic}/u, 'Arabic'],
  ] as const;
  const present = scripts.filter(([pattern]) => pattern.test(q));
  const script = present.length === 1 ? present[0][1] : null;
  const rows = (
    await db.query(
      `WITH scores AS MATERIALIZED (
    SELECT id,GREATEST(similarity(text_norm,$1),word_similarity($1,text_norm)) AS score FROM published_passages WHERE ($6::text IS NULL OR original_script=$6)
    UNION ALL SELECT id,GREATEST(similarity(transliteration_norm,$1),word_similarity($1,transliteration_norm)) FROM published_passages WHERE transliteration_norm<>'' AND ($6::text IS NULL OR $6='Latin')
    UNION ALL SELECT passage_id,GREATEST(similarity(text_norm,$1),word_similarity($1,text_norm)) FROM published_translations WHERE ($4::text IS NULL OR lang=$4)
  ), ranked AS (
    SELECT p.id,max(scores.score) AS score FROM scores JOIN published_passages p ON p.id=scores.id JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id
    WHERE ($2::text IS NULL OR w.slug=$2) AND ($3::text IS NULL OR t.slug=$3) GROUP BY p.id HAVING max(scores.score)>=0.35
  ) SELECT p.*,w.slug AS work,w.title AS work_title,t.slug AS tradition,t.name AS tradition_name,d.number AS chapter,to_jsonb(s) AS source,r.score
    FROM ranked r JOIN published_passages p ON p.id=r.id JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id JOIN divisions d ON d.id=p.division_id JOIN sources s ON s.id=p.source_id
    ORDER BY r.score DESC,p.ordinal LIMIT $5`,
      [q, work, tradition, options.lang ?? null, limit, script],
    )
  ).rows;
  const lexical: SearchHit[] = (await hydrate(db, rows)).map((p, i) => ({
    passage: p,
    score: Number(rows[i].score),
    match_type: 'fuzzy',
  }));
  if ((options.mode ?? 'all') !== 'all' || !modelConfigured('embedding')) return lexical;
  try {
    const semantic = await semanticSearch(db, query, options),
      byId = new Map([...semantic, ...lexical].map((h) => [h.passage.id, h]));
    return reciprocalRankFusion([
      lexical.map((h) => ({ id: h.passage.id })),
      semantic.map((h) => ({ id: h.passage.id })),
    ])
      .slice(0, limit)
      .map(({ id }) => byId.get(id)!);
  } catch {
    return lexical;
  }
}
export function reciprocalRankFusion(lists: { id: string }[][], k = 60) {
  const scores = new Map<string, number>();
  for (const list of lists)
    list.forEach((hit, index) =>
      scores.set(hit.id, (scores.get(hit.id) ?? 0) + 1 / (k + index + 1)),
    );
  return [...scores].sort((a, b) => b[1] - a[1]).map(([id, score]) => ({ id, score }));
}
