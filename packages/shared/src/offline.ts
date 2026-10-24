import { z } from 'zod';
import type { Passage, Source, Translation } from './index.ts';
const source = z
  .object({
    id: z.string(),
    name: z.string(),
    url: z.url().regex(/^https?:\/\//),
    license: z.string().min(1),
    license_url: z.url(),
    attribution: z.string(),
    retrieved_at: z.string(),
    checksum: z.string(),
    status: z.literal('approved'),
    commercial_ok: z.boolean(),
    display_rules: z.record(z.string(), z.unknown()),
  })
  .passthrough();
const translation = z
  .object({
    id: z.string(),
    passage_id: z.string(),
    source_id: z.string(),
    lang: z.string(),
    translator: z.string(),
    text: z.string(),
    is_machine: z.boolean(),
    source_ref: z.string().optional(),
  })
  .passthrough();
const passage = z.object({
  id: z.string(),
  ref: z.string(),
  work: z.string(),
  work_title: z.string(),
  tradition: z.string(),
  tradition_name: z.string(),
  source_id: z.string(),
  original_text: z.string(),
  original_script: z.string(),
  transliteration: z.string(),
  ordinal: z.number().int(),
  verse_number: z.number().int(),
  chapter: z.number().int(),
  division_id: z.string(),
  translations: z.array(translation),
  metadata: z.record(z.string(), z.unknown()).optional(),
  work_metadata: z.record(z.string(), z.unknown()).optional(),
});
export const offlinePackSchema = z.object({
  version: z.literal(1),
  downloadedAt: z.iso.datetime(),
  work: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string(),
    passage_count: z.number().int().positive(),
  }),
  sources: z.array(source).max(1000),
  divisions: z
    .array(z.object({ number: z.number().int(), title: z.string(), verse_count: z.number().int() }))
    .max(10000),
  passages: z.array(passage).min(1).max(100000),
});
export type OfflinePack = z.infer<typeof offlinePackSchema>;
export function parseOfflinePack(input: unknown): OfflinePack {
  const pack = offlinePackSchema.parse(input),
    ids = new Set(pack.sources.map((s) => s.id));
  if (
    pack.passages.length !== pack.work.passage_count ||
    new Set(pack.passages.map((p) => p.id)).size !== pack.passages.length
  )
    throw new Error('Offline passage count is inconsistent.');
  if (
    pack.passages.some(
      (p) =>
        p.work !== pack.work.slug ||
        !ids.has(p.source_id) ||
        p.translations.some((t) => !ids.has(t.source_id)),
    )
  )
    throw new Error('Offline source attribution is incomplete.');
  return pack;
}
export function hydrateOffline(pack: OfflinePack): Passage[] {
  const sources = new Map(pack.sources.map((s) => [s.id, s as Source]));
  return pack.passages.map((p) => ({
    ...p,
    source: sources.get(p.source_id)!,
    translations: p.translations.map(
      (t) => ({ ...t, source: sources.get(t.source_id)! }) as Translation,
    ),
  }));
}
