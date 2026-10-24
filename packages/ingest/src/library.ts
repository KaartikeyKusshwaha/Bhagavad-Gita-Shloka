import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { parse } from 'yaml';
import { z } from 'zod';
import type { Database } from '../../db/src/index.ts';
import { collectionSchema, ingestEdition } from './collections.ts';
import { licenseGate } from './licenseGate.ts';

const root = new URL('../../../data/', import.meta.url);
const manifestSchema = z.object({
  version: z.string(),
  works: z.array(
    z.object({
      id: z.string(),
      file: z.string().regex(/^library\/[a-z0-9-]+\.json\.gz$/),
      checksum: z.string().regex(/^[a-f0-9]{64}$/),
      passages: z.number().int().positive(),
      sections: z.number().int().positive(),
    }),
  ),
});
export async function readLibraryManifest() {
  const bytes = await readFile(new URL('imports/library-manifest.json', root));
  return {
    manifest: manifestSchema.parse(JSON.parse(bytes.toString())),
    checksum: createHash('sha256').update(bytes).digest('hex'),
  };
}
export async function readLibraryEdition(
  item: z.infer<typeof manifestSchema>['works'][number],
  checksum: string,
) {
  const bytes = await readFile(new URL(`imports/${item.file}`, root));
  if (createHash('sha256').update(bytes).digest('hex') !== item.checksum)
    throw new Error(`Edition checksum mismatch: ${item.id}`);
  const data = collectionSchema.parse(
    JSON.parse(gunzipSync(bytes, { maxOutputLength: 80_000_000 }).toString()),
  );
  if (
    data.work.id !== item.id ||
    data.passages.length !== item.passages ||
    data.divisions.length !== item.sections ||
    new Set(data.passages.map((p) => p.id)).size !== item.passages ||
    new Set(data.passages.map((p) => p.ref)).size !== item.passages
  )
    throw new Error(`Invalid edition: ${item.id}`);
  const divisions = new Set(data.divisions.map((d) => d.number));
  if (data.passages.some((p, i) => p.ordinal !== i + 1 || !divisions.has(p.chapter)))
    throw new Error(`Invalid edition order: ${item.id}`);
  const sources = [];
  for (const id of new Set([
    data.work.source_id,
    ...data.passages.flatMap((p) => p.translations.map((t) => t.source_id)),
  ])) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid source identifier');
    const source = licenseGate(parse(await readFile(new URL(`sources/${id}.yml`, root), 'utf8')));
    if (source.id !== id || source.checksum !== checksum)
      throw new Error(`Library source checksum mismatch: ${id}`);
    sources.push(source);
  }
  return { data, sources, checksum };
}
export async function ingestLibrary(db: Database, onlyMissing = false) {
  const { manifest, checksum } = await readLibraryManifest();
  const existing = new Set((await db.query('SELECT id FROM works')).rows.map((w) => String(w.id)));
  for (const item of manifest.works) {
    if (onlyMissing && existing.has(item.id)) continue;
    const edition = await readLibraryEdition(item, checksum);
    await ingestEdition(db, edition.data, edition.sources, checksum);
  }
  if (!onlyMissing || manifest.works.some((item) => !existing.has(item.id)))
    await db.exec(
      'ANALYZE passages; ANALYZE translations; ANALYZE works; ANALYZE sources; ANALYZE divisions',
    );
  return {
    works: manifest.works.length,
    passages: manifest.works.reduce((n, w) => n + w.passages, 0),
  };
}
