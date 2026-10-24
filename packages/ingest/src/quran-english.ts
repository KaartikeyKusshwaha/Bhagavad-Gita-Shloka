import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { z } from 'zod';
import type { Database } from '../../db/src/index.ts';
import { normalize } from '../../shared/src/index.ts';
import { licenseGate } from './licenseGate.ts';
export async function readQuranEnglish() {
  const bytes = await readFile(
    new URL('../../../data/imports/quran-english.json', import.meta.url),
  );
  const data = z
    .object({
      translations: z
        .array(
          z.object({
            passage_id: z.string().regex(/^quran\.\d+\.\d+$/),
            text: z.string().min(1),
            source_ref: z.string(),
          }),
        )
        .length(6236),
      provenance: z.object({ verse_strings_sha256: z.string() }),
    })
    .parse(JSON.parse(bytes.toString()));
  const source = licenseGate(
    parse(
      await readFile(
        new URL('../../../data/sources/clearquran-itani.yml', import.meta.url),
        'utf8',
      ),
    ),
  );
  if (
    createHash('sha256').update(bytes).digest('hex') !== source.checksum ||
    new Set(data.translations.map((t) => t.passage_id)).size !== 6236 ||
    createHash('sha256')
      .update(data.translations.map((t) => `${t.passage_id}|${t.text}`).join('\n'))
      .digest('hex') !== data.provenance.verse_strings_sha256
  )
    throw new Error('ClearQuran integrity mismatch');
  return { data, source };
}
export async function ingestQuranEnglish(db: Database, onlyMissing = false) {
  if (
    onlyMissing &&
    (await db.query("SELECT id FROM sources WHERE id='clearquran-itani'")).rows.length
  )
    return;
  const { data, source: s } = await readQuranEnglish();
  await db.transaction(async (tx) => {
    const existing = new Set(
      (await tx.query("SELECT id FROM passages WHERE work_id='quran'")).rows.map((p) => p.id),
    );
    if (data.translations.some((t) => !existing.has(t.passage_id)))
      throw new Error('English Quran verse alignment mismatch');
    await tx.query(
      `INSERT INTO sources(id,tradition_id,name,url,license,license_url,commercial_ok,attribution,retrieved_at,checksum,status,display_rules) VALUES($1,'islam',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) ON CONFLICT(id) DO NOTHING`,
      [
        s.id,
        s.name,
        s.url,
        s.license,
        s.license_url,
        s.commercial_ok,
        s.attribution,
        s.retrieved_at,
        s.checksum,
        s.status,
        JSON.stringify(s.display_rules),
      ],
    );
    for (let i = 0; i < data.translations.length; i += 200)
      await tx.query(
        `INSERT INTO translations(id,passage_id,source_id,lang,translator,text,text_norm,source_ref) SELECT x.passage_id||'.clearquran-itani.en',x.passage_id,'clearquran-itani','en','Talal Itani · ClearQuran',x.text,x.text_norm,x.source_ref FROM jsonb_to_recordset($1::jsonb) AS x(passage_id text,text text,text_norm text,source_ref text) ON CONFLICT(id) DO NOTHING`,
        [
          JSON.stringify(
            data.translations
              .slice(i, i + 200)
              .map((t) => ({ ...t, text_norm: normalize(t.text) })),
          ),
        ],
      );
  });
}
