import type { Database } from './index.ts';
import { getWorks, getDivisions, getReadingSlice } from './queries.ts';
import { parseOfflinePack } from '../../shared/src/offline.ts';
export async function createOfflinePack(db: Database, slug: string) {
  const work = (await getWorks(db)).find((w) => w.slug === slug);
  if (!work) return null;
  const passages = await getReadingSlice(db, slug, 0, Number(work.passage_count));
  const sources = new Map(
    passages
      .flatMap((p) => [p.source, ...p.translations.map((t) => t.source)])
      .map((s) => [s.id, s]),
  );
  return parseOfflinePack({
    version: 1,
    downloadedAt: new Date().toISOString(),
    work: { slug, title: String(work.title), passage_count: Number(work.passage_count) },
    sources: [...sources.values()],
    divisions: await getDivisions(db, slug),
    passages: passages.map((p) => ({
      ...p,
      source: undefined,
      audio: undefined,
      source_id: p.source.id,
      translations: p.translations.map((t) => ({
        ...t,
        source: undefined,
        source_id: t.source.id,
      })),
    })),
  });
}
