import { it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { connectDatabase, type Database } from '../../db/src/index.ts';
import { migrate } from '../../db/src/migrate.ts';
import type { Passage } from '../../shared/src/index.ts';
import { passageSpeech } from './cartesia.ts';
let db: Database;
beforeAll(async () => {
  db = await connectDatabase({ memory: true });
  await migrate(db);
}, 30000);
afterAll(async () => db.close());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const p = {
  id: 'sa-fixture',
  original_text: 'संस्कृतम्',
  source: { status: 'approved', checksum: 'sa-fixture', display_rules: { lang: 'sa' } },
} as unknown as Passage;
const wav = Buffer.alloc(200);
wav.write('RIFF');
wav.write('WAVE', 8);
function fixture(key: string) {
  vi.stubEnv('YOURVOIC_API_KEY', key);
  vi.stubEnv('YOURVOIC_CHAR_LIMIT', '2000');
  const fetcher = vi.fn(async (url: unknown, init?: RequestInit) => {
    expect(String(url)).toContain('https://yourvoic.com/api/v1/');
    expect((init?.headers as Record<string, string>)['X-API-Key']).toBe(key);
    if (String(url).includes('/languages'))
      return new Response(JSON.stringify({ languages: [{ code: 'sa' }] }));
    if (String(url).includes('/voices'))
      return new Response(
        JSON.stringify({ language: 'sa', voices: [{ id: 'Vidvan', name: 'Vidvan' }] }),
      );
    const body = JSON.parse(String(init?.body));
    expect(body.text).toBe(p.original_text);
    expect(body.language).toBe('sa');
    expect(body.voice).toBe('Vidvan');
    expect(body.model).toBe('aura-prime');
    return new Response(wav);
  });
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
it('routes Sanskrit only to YourVoic and persists audio separately from Cartesia', async () => {
  const fetcher = fixture('sanskrit-fixture-1');
  const first = await passageSpeech(db, p);
  expect(first.cached).toBe(false);
  expect(first.voice.locale).toBe('sa');
  const replay = await passageSpeech(db, p);
  expect(replay.cached).toBe(true);
  expect(replay.audio).toEqual(wav);
  expect(fetcher.mock.calls.filter(([u]) => String(u).endsWith('/tts/generate'))).toHaveLength(1);
  expect((await db.query('SELECT month FROM speech_usage')).rows[0].month).toBe(
    'yourvoic:lifetime',
  );
});
it('does not synthesize Sanskrit when the provider language list excludes it', async () => {
  fixture('sanskrit-fixture-2');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ languages: [{ code: 'hi' }] }))),
  );
  await expect(passageSpeech(db, p)).rejects.toMatchObject({ code: 'SPEECH_NO_SANSKRIT' });
});
it('refuses incorrectly labelled voices rather than routing Sanskrit to Hindi', async () => {
  fixture('sanskrit-fixture-3');
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).includes('languages')
              ? { languages: [{ code: 'sa' }] }
              : { language: 'hi', voices: [{ id: 'Vidvan', name: 'Vidvan' }] },
          ),
        ),
    ),
  );
  await expect(passageSpeech(db, p)).rejects.toMatchObject({ code: 'SPEECH_NO_SANSKRIT' });
});
