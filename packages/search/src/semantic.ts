import { createHash } from 'node:crypto';
import type { Database } from '../../db/src/index.ts';
import { hydrate } from '../../db/src/queries.ts';
import { embedTexts, modelConfigured, modelName, modelReady } from '../../llm/src/provider.ts';
import type { SearchHit } from '../../shared/src/index.ts';
import type { SearchOptions } from './index.ts';

const eligible = `FROM published_passages p JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id
 JOIN sources s ON s.id=p.source_id
 LEFT JOIN LATERAL (SELECT tr.id,tr.text,tr.source_id FROM published_translations tr JOIN sources ts ON ts.id=tr.source_id
   WHERE tr.passage_id=p.id AND tr.lang='en' AND COALESCE((ts.display_rules->>'no_generative_ai')::boolean,false)=false ORDER BY tr.translator LIMIT 1) tr ON true
 WHERE COALESCE((s.display_rules->>'no_generative_ai')::boolean,false)=false`;

interface Coverage {
  configured: boolean;
  indexed: number;
  eligible: number;
}
const coverageCache = new WeakMap<Database, Map<string, { at: number; value: Coverage }>>();
export async function semanticCoverage(
  db: Database,
  work?: string,
  tradition?: string,
): Promise<Coverage> {
  const key = `${modelName('embedding')}:${modelConfigured('embedding')}:${work ?? ''}:${tradition ?? ''}`;
  const cache = coverageCache.get(db) ?? new Map();
  coverageCache.set(db, cache);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < 5000) return cached.value;
  const row = (
    await db.query(
      `SELECT (SELECT count(*)::int FROM published_passages p JOIN sources s ON s.id=p.source_id JOIN works w ON w.id=p.work_id WHERE COALESCE((s.display_rules->>'no_generative_ai')::boolean,false)=false AND ($2::text IS NULL OR w.slug=$2) AND ($3::text IS NULL OR w.tradition_id=$3)) AS eligible,
      (SELECT count(*)::int FROM embeddings e JOIN published_passages p ON p.id=e.passage_id JOIN works w ON w.id=p.work_id JOIN sources s ON s.id=p.source_id LEFT JOIN LATERAL (SELECT tr.text FROM published_translations tr JOIN sources ts ON ts.id=tr.source_id WHERE tr.passage_id=p.id AND tr.lang='en' AND COALESCE((ts.display_rules->>'no_generative_ai')::boolean,false)=false ORDER BY tr.translator LIMIT 1) tr ON true WHERE e.model=$1 AND COALESCE((s.display_rules->>'no_generative_ai')::boolean,false)=false AND e.content_hash=encode(sha256(convert_to(COALESCE(tr.text,p.original_text),'UTF8')),'hex') AND ($2::text IS NULL OR w.slug=$2) AND ($3::text IS NULL OR w.tradition_id=$3)) AS indexed`,
      [modelName('embedding'), work ?? null, tradition ?? null],
    )
  ).rows[0];
  const value = {
    configured: modelConfigured('embedding'),
    indexed: Number(row.indexed),
    eligible: Number(row.eligible),
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
export async function indexEmbeddings(
  db: Database,
  onProgress: (done: number, total: number) => void = () => {},
) {
  if (!modelConfigured('embedding'))
    throw new Error('Set EMBEDDING_BASE_URL for the existing embedding runtime.');
  const model = modelName('embedding');
  const rows = (
    await db.query(
      `SELECT p.id,COALESCE(tr.text,p.original_text) AS text,tr.id AS translation_id ${eligible}
    AND NOT EXISTS(SELECT 1 FROM embeddings e WHERE e.passage_id=p.id AND e.model=$1 AND e.content_hash=encode(sha256(convert_to(COALESCE(tr.text,p.original_text),'UTF8')),'hex')) ORDER BY w.title,p.ordinal`,
      [model],
    )
  ).rows;
  for (let offset = 0; offset < rows.length; offset += 8) {
    const batch = rows.slice(offset, offset + 8),
      vectors = await embedTexts(batch.map((row) => String(row.text).slice(0, 12000)));
    await db.transaction(async (tx) => {
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        await tx.query(
          `INSERT INTO embeddings(passage_id,translation_id,model,vector,content_hash) VALUES($1,$2,$3,$4::vector,$5)
          ON CONFLICT(passage_id,model) DO UPDATE SET translation_id=EXCLUDED.translation_id,vector=EXCLUDED.vector,content_hash=EXCLUDED.content_hash`,
          [
            row.id,
            row.translation_id ?? null,
            model,
            JSON.stringify(vectors[i]),
            createHash('sha256').update(String(row.text)).digest('hex'),
          ],
        );
      }
    });
    onProgress(Math.min(offset + 8, rows.length), rows.length);
  }
  return semanticCoverage(db);
}
export async function semanticSearch(
  db: Database,
  query: string,
  options: SearchOptions = {},
): Promise<SearchHit[]> {
  const coverage = await semanticCoverage(db, options.work, options.tradition);
  if (!coverage.configured || !coverage.indexed || !(await modelReady('embedding')))
    throw new Error('SEMANTIC_UNAVAILABLE');
  const [vector] = await embedTexts([query], true);
  const rows = (
    await db.query(
      `SELECT p.*,w.slug AS work,w.title AS work_title,t.slug AS tradition,t.name AS tradition_name,d.number AS chapter,to_jsonb(s) AS source,1-(e.vector<=>$1::vector) AS score
    FROM embeddings e JOIN published_passages p ON p.id=e.passage_id JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id JOIN divisions d ON d.id=p.division_id JOIN sources s ON s.id=p.source_id
    LEFT JOIN published_translations tr ON tr.id=e.translation_id LEFT JOIN sources ts ON ts.id=tr.source_id
    WHERE e.model=$2 AND ($3::text IS NULL OR w.slug=$3) AND ($4::text IS NULL OR t.slug=$4)
      AND COALESCE((s.display_rules->>'no_generative_ai')::boolean,false)=false
      AND (e.translation_id IS NULL OR (tr.id IS NOT NULL AND COALESCE((ts.display_rules->>'no_generative_ai')::boolean,false)=false))
      AND ($6::text IS NULL OR COALESCE(tr.lang,w.original_lang)=$6)
      AND e.content_hash=encode(sha256(convert_to(COALESCE(tr.text,p.original_text),'UTF8')),'hex')
    ORDER BY e.vector<=>$1::vector LIMIT $5`,
      [
        JSON.stringify(vector),
        modelName('embedding'),
        options.work ?? null,
        options.tradition ?? null,
        Math.max(1, Math.min(options.limit ?? 10, 50)),
        options.lang ?? null,
      ],
    )
  ).rows;
  return (await hydrate(db, rows)).map((p, i) => ({
    passage: p,
    score: Number(rows[i].score),
    match_type: 'semantic',
  }));
}
