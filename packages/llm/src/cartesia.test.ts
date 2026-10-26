import { beforeAll, afterAll, afterEach, it, expect, vi } from 'vitest';
import { connectDatabase, type Database } from '../../db/src/index.ts';
import { migrate } from '../../db/src/migrate.ts';
import type { Passage } from '../../shared/src/index.ts';
import { passageSpeech, speechEligibility } from './cartesia.ts';
let db: Database;
beforeAll(async () => {
  db = await connectDatabase({ memory: true });
  await migrate(db);
}, 30000);
afterAll(async () => {
  await db.close();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const voice = '11111111-1111-4111-8111-111111111111';
const wav = Buffer.alloc(200);
wav.write('RIFF');
wav.write('WAVE', 8);
function setup(key: string, text: string) {
  vi.stubEnv('CARTESIA_API_KEY', key);
  vi.stubEnv('CARTESIA_MONTHLY_CHAR_LIMIT', '18000');
  const passage = {
    id: 'fixture',
    original_text: text,
    source: { status: 'approved', checksum: 'source-checksum', display_rules: { lang: 'en' } },
  } as unknown as Passage;
  const fetcher = vi.fn(async (url: unknown, init?: RequestInit) => {
    if (String(url).includes('/voices'))
      return new Response(
        JSON.stringify({
          data: [
            {
              id: voice,
              name: 'Native fixture',
              language: 'en',
              status: 'active',
              access: 'public',
              accents: [{ locale: 'en-GB', is_native: true }],
            },
            {
              id: '22222222-2222-4222-8222-222222222222',
              name: 'Cross-language',
              language: 'hi',
              status: 'active',
              access: 'public',
              accents: [{ locale: 'en-US', is_native: false }],
            },
          ],
        }),
      );
    const body = JSON.parse(String(init?.body));
    expect(body.transcript).toBe(text);
    expect(body.locale).toBe('en-GB');
    expect(body.voice).toBe(voice);
    expect(body.normalization).toBe('off');
    expect(body.transcript).not.toContain(key);
    return new Response(wav, { headers: { 'Content-Type': 'audio/wav' } });
  });
  vi.stubGlobal('fetch', fetcher);
  return { passage, fetcher };
}
it('sends only original stored text with a native voice, persists exact audio and does not charge replays', async () => {
  const { passage, fetcher } = setup('fixture-cache-key', 'Synthetic cache fixture text.');
  await db.query('DELETE FROM speech_usage');
  const a = await passageSpeech(db, passage),
    b = await passageSpeech(db, passage);
  expect(a.cached).toBe(false);
  expect(b.cached).toBe(true);
  expect(b.audio).toEqual(wav);
  expect(fetcher.mock.calls.filter(([u]) => String(u).endsWith('/tts/bytes'))).toHaveLength(1);
  expect(Number((await db.query('SELECT characters FROM speech_usage')).rows[0].characters)).toBe(
    Array.from(passage.original_text).length,
  );
});
it('coalesces simultaneous requests for the same audio', async () => {
  const { passage, fetcher } = setup(
    'fixture-coalesce-key',
    'A separate simultaneous fixture sentence.',
  );
  const results = await Promise.all([passageSpeech(db, passage), passageSpeech(db, passage)]);
  expect(results[0].audio).toEqual(results[1].audio);
  expect(fetcher.mock.calls.filter(([u]) => String(u).endsWith('/tts/bytes'))).toHaveLength(1);
});
it('invalidates audio on source text or provenance changes and rejects arbitrary voices', async () => {
  const { passage, fetcher } = setup('fixture-provenance-key', 'A provenance fixture.');
  await passageSpeech(db, passage);
  await passageSpeech(db, { ...passage, source: { ...passage.source, checksum: 'new-edition' } });
  expect(fetcher.mock.calls.filter(([u]) => String(u).endsWith('/tts/bytes'))).toHaveLength(2);
  await expect(
    passageSpeech(db, passage, '22222222-2222-4222-8222-222222222222'),
  ).rejects.toMatchObject({ code: 'SPEECH_INVALID_VOICE' });
});
it('blocks Sanskrit and restricted sources before any provider call', async () => {
  const { passage, fetcher } = setup('fixture-restriction-key', 'Restricted fixture.');
  for (const display_rules of [
    { lang: 'sa' },
    { lang: 'en', no_generative_ai: true },
    { lang: 'ar', preserve_verbatim: true },
  ]) {
    const p = { ...passage, source: { ...passage.source, display_rules } };
    expect(speechEligibility(p).available).toBe(false);
    await expect(passageSpeech(db, p)).rejects.toMatchObject({ code: 'SPEECH_NOT_SUPPORTED' });
  }
  expect(fetcher).not.toHaveBeenCalled();
});
it('stops generation at the persistent budget and continues serving existing cached audio', async () => {
  const { passage, fetcher } = setup('fixture-budget-key', 'A budget fixture.');
  await passageSpeech(db, passage);
  vi.stubEnv('CARTESIA_MONTHLY_CHAR_LIMIT', '0');
  expect((await passageSpeech(db, passage)).cached).toBe(true);
  await expect(
    passageSpeech(db, { ...passage, original_text: 'Uncached budget fixture.' }),
  ).rejects.toMatchObject({ code: 'SPEECH_BUDGET' });
  expect(fetcher.mock.calls.filter(([u]) => String(u).endsWith('/tts/bytes'))).toHaveLength(1);
});
it('never caches invalid audio or publishes a provider failure as successful speech', async () => {
  const { passage, fetcher } = setup('fixture-failure-key', 'Invalid audio fixture.');
  fetcher.mockImplementation(async (url) =>
    String(url).includes('/voices')
      ? new Response(
          JSON.stringify({
            data: [
              {
                id: voice,
                name: 'Fixture',
                language: 'en',
                status: 'active',
                access: 'public',
                accents: [{ locale: 'en-GB', is_native: true }],
              },
            ],
          }),
        )
      : new Response('Not audio'),
  );
  await expect(passageSpeech(db, passage)).rejects.toMatchObject({ code: 'SPEECH_INVALID_AUDIO' });
  fetcher.mockImplementation(async () => new Response('{}', { status: 401 }));
  await expect(passageSpeech(db, passage)).rejects.toMatchObject({ code: 'SPEECH_CREDENTIALS' });
});
