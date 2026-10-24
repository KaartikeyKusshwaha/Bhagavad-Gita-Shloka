import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { connectDatabase, type Database } from '../packages/db/src/index.ts';
import { migrate } from '../packages/db/src/migrate.ts';
import { ingestGita } from '../packages/ingest/src/index.ts';
import {
  freeCollections,
  ingestCollection,
  readCollection,
} from '../packages/ingest/src/collections.ts';
import { createApp } from '../apps/api/src/app.ts';
import { searchPassages } from '../packages/search/src/index.ts';
import { getPassage, getDivisions } from '../packages/db/src/queries.ts';
import { passageConnections } from '../packages/search/src/connections.ts';
import { browseTheme } from '../packages/search/src/themes.ts';
import { ingestAudio } from '../packages/ingest/src/audio.ts';
import { createOfflinePack } from '../packages/db/src/offline.ts';
import { hydrateOffline, parseOfflinePack } from '../packages/shared/src/offline.ts';
import type { FastifyInstance } from 'fastify';
let db: Database, app: FastifyInstance;
beforeAll(async () => {
  db = await connectDatabase(
    process.env.CI && process.env.DATABASE_URL ? undefined : { memory: true },
  );
  await migrate(db);
  await ingestGita(db);
  for (const slug of freeCollections) await ingestCollection(db, slug);
  await ingestAudio(db);
  app = await createApp(db);
}, 30000);
afterAll(async () => {
  await app?.close();
  await db?.close();
});
describe('imported text and actual API', () => {
  it('creates a complete offline edition with shared source records and unchanged Quran strings', async () => {
    const pack = (await createOfflinePack(db, 'quran'))!;
    expect(pack.passages).toHaveLength(6236);
    expect(pack.sources).toHaveLength(1);
    const parsed = parseOfflinePack(JSON.parse(JSON.stringify(pack))),
      loaded = hydrateOffline(parsed);
    const online = (await getPassage(db, 'quran', 'Quran 1:1'))!;
    expect(loaded[0].original_text).toBe(online.original_text);
    expect(loaded[0].source.display_rules.copyright_notice).toBe(
      online.source.display_rules.copyright_notice,
    );
    expect(() => parseOfflinePack({ ...pack, sources: [] })).toThrow();
    expect(await createOfflinePack(db, 'unknown')).toBeNull();
  });
  it('publishes a licensed human recording with its actual whole-surah scope', async () => {
    const p = await getPassage(db, 'quran', 'Quran 1:1');
    expect(p?.audio?.[0].is_human).toBe(true);
    expect(p?.audio?.[0].source.display_rules.scope).toContain('all seven verses');
    const response = await app.inject('/v1/speech/tts?passage_id=quran.1.1');
    expect(response.json().reciter).toBe('Adeel Shaikh');
    expect(response.json().source.license).toBe('CC-BY-SA-4.0');
    expect((await app.inject('/v1/speech/tts?passage_id=bg.2.47')).statusCode).toBe(404);
  });
  it('distinguishes source sequence from suggestions and shows themed wording across traditions', async () => {
    const p = (await getPassage(db, 'bhagavad-gita', 'BG 2.47'))!;
    const graph = await passageConnections(db, p);
    expect(graph.nodes[0].id).toBe(p.id);
    expect(graph.edges.filter((e) => e.kind === 'source_sequence').map((e) => e.to)).toEqual([
      'bg.2.46',
      'bg.2.48',
    ]);
    expect(graph.edges.some((e) => e.kind === 'cross_reference')).toBe(false);
    expect(
      graph.edges
        .filter((e) => e.kind === 'suggested')
        .every((e) => e.basis.name === 'Automatic wording comparison'),
    ).toBe(true);
    const theme = (await browseTheme(db, 'compassion'))!;
    expect(new Set(theme.hits.map((h) => h.passage.tradition))).toEqual(
      new Set(['buddhism', 'hinduism', 'islam']),
    );
    expect(theme.note).toContain('not a claim');
    expect(await browseTheme(db, 'unlisted')).toBeNull();
    const selected = (await browseTheme(db, 'compassion', 'quran'))!;
    expect(selected.hits.every((h) => h.passage.work === 'quran')).toBe(true);
  });
  it('loads 700 verses, 700 translations and correct chapter counts', async () => {
    expect(
      Number(
        (
          await db.query(
            "SELECT count(*) AS n FROM published_passages WHERE work_id='bhagavad-gita'",
          )
        ).rows[0].n,
      ),
    ).toBe(700);
    expect(
      Number(
        (
          await db.query(
            "SELECT count(*) AS n FROM published_translations WHERE passage_id LIKE 'bg.%'",
          )
        ).rows[0].n,
      ),
    ).toBe(700);
    expect((await getDivisions(db, 'bhagavad-gita')).map((x) => x.verse_count)).toEqual([
      47, 72, 43, 42, 29, 47, 30, 28, 34, 42, 55, 20, 34, 27, 20, 24, 28, 78,
    ]);
    const p = await getPassage(db, 'bhagavad-gita', 'BG 13.1');
    expect(p?.translations[0].source_ref).toBe('Besant 13.2');
    const rows = (await db.query('SELECT text FROM published_translations')).rows;
    expect(
      rows.filter((row) => /<[^>]+>|Proofreadpage|data-mw|\{\s*"/.test(String(row.text))),
    ).toEqual([]);
  });
  it('reads and searches actual Quran and Dhammapada editions without changing the Quran text', async () => {
    const original = (await readCollection('quran')).data.passages.find(
      (p) => p.ref === 'Quran 2:255',
    )!;
    const verse = await getPassage(db, 'quran', 'Quran 2:255');
    expect(verse?.original_text).toBe(original.original_text);
    expect(verse?.source.display_rules.preserve_verbatim).toBe(true);
    expect(verse?.translations).toHaveLength(0);
    expect(
      (await searchPassages(db, 'بسم الله الرحمن الرحيم', { work: 'quran', mode: 'exact' })).length,
    ).toBeGreaterThan(0);
    expect((await searchPassages(db, 'Quran 2:255'))[0].passage.id).toBe(original.id);
    expect(await searchPassages(db, 'BG 2.47', { work: 'quran' })).toHaveLength(0);
    const dhp = await getPassage(db, 'dhammapada', 'Dhp 5');
    expect(dhp?.translations[0].translator).toBe('Bhikkhu Sujato');
    expect((await searchPassages(db, dhp!.original_text, { mode: 'exact' }))[0].match_type).toBe(
      'exact',
    );
    expect(
      (await searchPassages(db, dhp!.translations[0].text, { mode: 'exact' }))[0].passage.id,
    ).toBe('dhp.5');
    const chapter = (await getDivisions(db, 'dhammapada'))[1];
    expect((chapter.verses as { number: number }[])[0].number).toBe(21);
    expect(await getDivisions(db, 'quran')).toHaveLength(114);
  });
  it('finds references, Sanskrit, Roman Sanskrit, English and a typo', async () => {
    for (const q of [
      'BG 2.47',
      'कर्मण्येवाधिकारस्ते',
      'karmanye vadhikaraste',
      'Thy business is with the action only',
    ]) {
      const hits = await searchPassages(db, q);
      expect(
        hits.slice(0, 5).map((x) => x.passage.ref),
        q,
      ).toContain('BG 2.47');
    }
  });
  it('publishes source records and rejects invalid passages/requests', async () => {
    const response = await app.inject('/v1/passages/bhagavad-gita/BG-2.47');
    expect(response.statusCode).toBe(200);
    expect(response.json().passage.source.license).toBe('CC-BY-SA-4.0');
    expect((await app.inject('/v1/passages/bhagavad-gita/BG-1.78')).statusCode).toBe(404);
    expect(
      (await app.inject({ method: 'POST', url: '/v1/verify', payload: { claim: '' } })).statusCode,
    ).toBe(400);
    expect((await app.inject('/v1/search?q=karma&mode=semantic')).statusCode).toBe(503);
  });
  it('returns scripture before explanation, verifies exact words and stores no raw claim', async () => {
    const p = await getPassage(db, 'bhagavad-gita', 'BG 2.47');
    const response = await app.inject({
      method: 'POST',
      url: '/v1/verify',
      payload: { claim: p!.translations[0].text },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().verdict).toBe('accurate');
    expect(response.json().quote_check).toBe('pass');
    const row = (await db.query('SELECT * FROM verify_logs LIMIT 1')).rows[0];
    expect(Object.keys(row)).not.toContain('claim');
    expect(String(row.claim_hash)).toHaveLength(64);
  });
  it('keeps reports durable, rejects unauthorized admin writes and gates named reviewers', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/reports',
      payload: {
        passage_id: 'bg.2.47',
        kind: 'error',
        message: 'Synthetic integration test report for reference checking.',
      },
    });
    expect(response.statusCode).toBe(201);
    expect(
      (await db.query('SELECT id FROM reports WHERE id=$1', [response.json().id])).rows,
    ).toHaveLength(1);
    expect((await app.inject('/v1/admin/reports')).statusCode).toBe(401);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/scholar-questions',
          payload: { tradition: 'hinduism', question: 'Please explain this passage in context.' },
        })
      ).statusCode,
    ).toBe(409);
  });
  it('allows the web server to attach exactly one fallback handler', async () => {
    const web = await createApp(db, { web: true });
    expect(() =>
      web.setNotFoundHandler((_req, reply) => reply.code(404).send('web')),
    ).not.toThrow();
    await web.close();
  });
});
