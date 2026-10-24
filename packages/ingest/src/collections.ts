import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { z } from 'zod';
import type { Database } from '../../db/src/index.ts';
import { normalize } from '../../shared/src/index.ts';
import { licenseGate } from './licenseGate.ts';

export const freeCollections = ['quran', 'dhammapada'] as const;
const translationSchema = z.object({
  lang: z.string().min(2),
  translator: z.string().min(1),
  text: z.string().min(1),
  source_id: z.string().min(1),
  source_ref: z.string().min(1),
});
export const collectionSchema = z.object({
  work: z.object({
    id: z.string().min(1),
    tradition: z.string().min(1),
    title: z.string().min(1),
    lang: z.string().min(2),
    script: z.string().min(1),
    source_id: z.string().min(1),
  }),
  divisions: z.array(z.object({ number: z.number().int().positive(), title: z.string().min(1) })),
  passages: z.array(
    z.object({
      id: z.string().min(1),
      ref: z.string().min(1),
      chapter: z.number().int().positive(),
      verse: z.number().int().positive(),
      ordinal: z.number().int().positive(),
      original_text: z.string().min(1),
      transliteration: z.string(),
      translations: z.array(translationSchema),
    }),
  ),
  copyright_notice: z.string().optional(),
  provenance: z.record(z.string(), z.unknown()),
});

export async function readCollection(slug: (typeof freeCollections)[number]) {
  const bytes = await readFile(new URL(`../../../data/imports/${slug}.json`, import.meta.url));
  const data = collectionSchema.parse(JSON.parse(bytes.toString('utf8')));
  const expected = slug === 'quran' ? 6236 : 423;
  if (data.work.id !== slug || data.passages.length !== expected)
    throw new Error(`Invalid collection: ${slug}`);
  if (
    new Set(data.passages.map((p) => p.id)).size !== expected ||
    new Set(data.passages.map((p) => p.ref)).size !== expected
  )
    throw new Error(`Duplicate passages: ${slug}`);
  if (
    data.passages.some(
      (p, i) => p.ordinal !== i + 1 || !data.divisions.some((d) => d.number === p.chapter),
    )
  )
    throw new Error(`Invalid passage order/division: ${slug}`);
  const sourceIds = new Set([
    data.work.source_id,
    ...data.passages.flatMap((p) => p.translations.map((t) => t.source_id)),
  ]);
  const checksum = createHash('sha256').update(bytes).digest('hex');
  const sources = [];
  for (const id of sourceIds) {
    const source = licenseGate(
      parse(await readFile(new URL(`../../../data/sources/${id}.yml`, import.meta.url), 'utf8')),
    );
    if (source.id !== id || source.checksum !== checksum)
      throw new Error(`Source checksum mismatch: ${id}`);
    sources.push(source);
  }
  return { data, sources, checksum };
}

export async function ingestCollection(db: Database, slug: (typeof freeCollections)[number]) {
  const { data, sources, checksum } = await readCollection(slug);
  const w = data.work;
  return db.transaction(async (tx) => {
    for (const s of sources)
      await tx.query(
        `INSERT INTO sources(id,tradition_id,name,url,license,license_url,commercial_ok,attribution,retrieved_at,checksum,version,status,display_rules)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) ON CONFLICT(id) DO NOTHING`,
        [
          s.id,
          w.tradition,
          s.name,
          s.url,
          s.license,
          s.license_url,
          s.commercial_ok,
          s.attribution,
          s.retrieved_at,
          checksum,
          String(s.display_rules.edition ?? ''),
          s.status,
          JSON.stringify(s.display_rules),
        ],
      );
    await tx.query(
      'INSERT INTO works(id,tradition_id,slug,title,original_lang) VALUES($1,$2,$1,$3,$4) ON CONFLICT(id) DO NOTHING',
      [w.id, w.tradition, w.title, w.lang],
    );
    for (const d of data.divisions)
      await tx.query(
        'INSERT INTO divisions(id,work_id,number,title) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',
        [`${w.id}.${d.number}`, w.id, d.number, d.title],
      );
    for (let i = 0; i < data.passages.length; i += 200) {
      const batch = data.passages.slice(i, i + 200);
      // Preserve display text verbatim. Search normalization is a separate column.
      await tx.query(
        `INSERT INTO passages(id,work_id,division_id,source_id,ref,ordinal,verse_number,original_text,text_norm,original_script,transliteration,transliteration_norm)
        SELECT x.id,$2,x.division_id,$3,x.ref,x.ordinal,x.verse_number,x.original_text,x.text_norm,$4,x.transliteration,x.transliteration_norm
        FROM jsonb_to_recordset($1::jsonb) AS x(id text,division_id text,ref text,ordinal int,verse_number int,original_text text,text_norm text,transliteration text,transliteration_norm text)
        ON CONFLICT(id) DO NOTHING`,
        [
          JSON.stringify(
            batch.map((p) => ({
              ...p,
              division_id: `${w.id}.${p.chapter}`,
              verse_number: p.verse,
              text_norm: normalize(p.original_text),
              transliteration_norm: normalize(p.transliteration),
            })),
          ),
          w.id,
          w.source_id,
          w.script,
        ],
      );
      const translations = batch.flatMap((p) =>
        p.translations.map((t) => ({
          ...t,
          id: `${p.id}.${t.source_id}.${t.lang}`,
          passage_id: p.id,
          text_norm: normalize(t.text),
        })),
      );
      if (translations.length)
        await tx.query(
          `INSERT INTO translations(id,passage_id,source_id,lang,translator,text,text_norm,source_ref)
        SELECT x.id,x.passage_id,x.source_id,x.lang,x.translator,x.text,x.text_norm,x.source_ref
        FROM jsonb_to_recordset($1::jsonb) AS x(id text,passage_id text,source_id text,lang text,translator text,text text,text_norm text,source_ref text)
        ON CONFLICT(id) DO NOTHING`,
          [JSON.stringify(translations)],
        );
    }
    return { work: w.id, passages: data.passages.length, checksum };
  });
}
