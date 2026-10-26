import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Database } from '../../db/src/index.ts';
import type { Passage } from '../../shared/src/index.ts';
import { cartesiaLanguages } from '../../shared/src/speech.ts';
import { SpeechError } from './speech-error.ts';
import { sanskritModel, sanskritVoices, generateSanskrit } from './yourvoic.ts';
export { SpeechError } from './speech-error.ts';

const version = '2026-08-14';
export const speechModel = 'sonic-3.6-2026-08-27';
export function speechProvider(lang: string) {
  return lang === 'sa'
    ? { provider: 'yourvoic', model: sanskritModel }
    : { provider: 'cartesia', model: speechModel };
}
const voiceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(200),
  language: z.string(),
  status: z.string(),
  access: z.string(),
  accents: z.array(z.object({ locale: z.string(), is_native: z.boolean() })).default([]),
});
export type SpeechVoice = { id: string; name: string; locale: string };
const voicesCache = new Map<string, { at: number; voices: SpeechVoice[] }>();
const pending = new Map<string, Promise<Buffer>>();
let active = 0;
function headers() {
  const key = process.env.CARTESIA_API_KEY;
  if (!key) throw new SpeechError('SPEECH_UNAVAILABLE', 'Original-text speech is not configured.');
  return {
    Authorization: `Bearer ${key}`,
    'Cartesia-Version': version,
    'Content-Type': 'application/json',
  };
}
async function provider(path: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`https://api.cartesia.ai/${path}`, {
      ...init,
      headers: headers(),
      signal: AbortSignal.timeout(45000),
    });
  } catch (error) {
    if (error instanceof SpeechError) throw error;
    throw new SpeechError('SPEECH_CONNECTION', 'Cartesia could not be reached. Please retry.');
  }
  if (!response.ok)
    throw new SpeechError(
      response.status === 429
        ? 'SPEECH_PROVIDER_LIMIT'
        : response.status === 401 || response.status === 403
          ? 'SPEECH_CREDENTIALS'
          : 'SPEECH_PROVIDER_ERROR',
      response.status === 429
        ? 'Cartesia’s request or credit limit was reached. Please try later.'
        : response.status === 401 || response.status === 403
          ? 'Cartesia rejected the server credentials or model permission. Please contact the maintainer.'
          : 'Cartesia could not generate this audio. Please retry.',
    );
  return response;
}
export function speechEligibility(p: Passage) {
  const lang = String(p.source.display_rules.lang ?? '');
  if (lang !== 'sa' && !cartesiaLanguages.has(lang))
    return {
      available: false,
      lang,
      reason: `Cartesia does not support this source language (${lang || 'unknown'}). No other language’s voice will be substituted.`,
    };
  if (
    p.source.status !== 'approved' ||
    p.source.display_rules.no_generative_ai === true ||
    p.source.display_rules.preserve_verbatim === true
  )
    return {
      available: false,
      lang,
      reason: 'This source edition is not enabled for synthetic speech under its reuse rules.',
    };
  if (p.original_text.length > 4000)
    return {
      available: false,
      lang,
      reason:
        'This source block exceeds the 4,000-character speech limit. Choose a shorter passage.',
    };
  if (!(lang === 'sa' ? process.env.YOURVOIC_API_KEY : process.env.CARTESIA_API_KEY))
    return { available: false, lang, reason: 'Original-text speech is not configured.' };
  return { available: true, lang, reason: '' };
}
export async function nativeVoices(lang: string): Promise<SpeechVoice[]> {
  if (lang === 'sa') return sanskritVoices();
  const key =
    createHash('sha256')
      .update(process.env.CARTESIA_API_KEY ?? '')
      .digest('hex') + lang;
  const cached = voicesCache.get(key);
  if (cached && Date.now() - cached.at < 3600000) return cached.voices;
  const data = z
    .object({ data: z.array(voiceSchema) })
    .parse(await (await provider(`voices?language=${encodeURIComponent(lang)}&limit=100`)).json());
  const voices = data.data
    .filter((v) => v.status === 'active' && v.access === 'public' && v.language === lang)
    .flatMap((v) => {
      const locale = v.accents.find((a) => a.is_native && a.locale.split('-')[0] === lang)?.locale;
      return locale ? [{ id: v.id, name: v.name, locale }] : [];
    })
    .slice(0, 3);
  if (!voices.length)
    throw new SpeechError(
      'SPEECH_NO_NATIVE_VOICE',
      'No matching native-language voice is available from Cartesia.',
    );
  if (voicesCache.size >= 60) voicesCache.clear();
  voicesCache.set(key, { at: Date.now(), voices });
  return voices;
}
export async function passageSpeech(db: Database, p: Passage, voiceId?: string) {
  const eligibility = speechEligibility(p);
  if (!eligibility.available)
    throw new SpeechError('SPEECH_NOT_SUPPORTED', eligibility.reason, 422);
  const voices = await nativeVoices(eligibility.lang),
    voice = voiceId ? voices.find((v) => v.id === voiceId) : voices[0];
  if (!voice)
    throw new SpeechError(
      'SPEECH_INVALID_VOICE',
      'Choose one of the native voices listed for this passage.',
      400,
    );
  const key = createHash('sha256')
    .update(
      JSON.stringify([
        speechProvider(eligibility.lang),
        voice.id,
        voice.locale,
        p.source.checksum,
        p.original_text,
        'speed-0.9:normalization-off:wav',
      ]),
    )
    .digest('hex');
  const cached = (await db.query('SELECT audio FROM speech_cache WHERE key=$1', [key])).rows[0];
  if (cached) return { audio: Buffer.from(cached.audio as Uint8Array), voice, cached: true };
  const inFlight = pending.get(key);
  if (inFlight) return { audio: await inFlight, voice, cached: true };
  if (active >= 2)
    throw new SpeechError(
      'SPEECH_BUSY',
      'Two speech requests are already running. Please retry shortly.',
    );
  const generate = async () => {
    active++;
    try {
      const sanskrit = eligibility.lang === 'sa';
      const month = sanskrit
          ? 'yourvoic:lifetime'
          : `cartesia:${new Date().toISOString().slice(0, 7)}`,
        chars = Array.from(p.original_text).length;
      const maximum = sanskrit ? 2000 : 18000;
      const configured = Number(
        sanskrit
          ? (process.env.YOURVOIC_CHAR_LIMIT ?? maximum)
          : (process.env.CARTESIA_MONTHLY_CHAR_LIMIT ?? maximum),
      );
      const limit = Number.isFinite(configured)
        ? Math.max(0, Math.min(configured, maximum))
        : maximum;
      const reserved = await db.query(
        `INSERT INTO speech_usage(month,characters) SELECT $1::text,$2::integer WHERE $2::integer <= $3::integer ON CONFLICT(month) DO UPDATE SET characters=speech_usage.characters+EXCLUDED.characters WHERE speech_usage.characters+EXCLUDED.characters <= $3::integer RETURNING characters`,
        [month, chars, limit],
      );
      if (!reserved.rows.length)
        throw new SpeechError(
          'SPEECH_BUDGET',
          `This website’s free ${sanskrit ? 'Sanskrit' : 'monthly'} speech generation allowance is used up. Previously generated audio remains playable.`,
          429,
        );
      const response = sanskrit
        ? await generateSanskrit(p.original_text, voice.id)
        : await provider('tts/bytes', {
            method: 'POST',
            body: JSON.stringify({
              model_id: speechModel,
              transcript: p.original_text,
              voice: voice.id,
              locale: voice.locale,
              normalization: 'off',
              output_format: { container: 'wav', encoding: 'pcm_s16le', sample_rate: 24000 },
              generation_config: { speed: 0.9, volume: 1 },
            }),
          });
      const bytes = Buffer.from(await response.arrayBuffer());
      if (
        bytes.length < 100 ||
        bytes.length > 8 * 1024 * 1024 ||
        bytes.toString('ascii', 0, 4) !== 'RIFF' ||
        bytes.toString('ascii', 8, 12) !== 'WAVE'
      )
        throw new SpeechError(
          'SPEECH_INVALID_AUDIO',
          'The speech provider returned invalid audio. Please retry.',
        );
      await db.query(
        'INSERT INTO speech_cache(key,audio) VALUES($1,$2) ON CONFLICT(key) DO NOTHING',
        [key, bytes],
      );
      return bytes;
    } finally {
      active--;
    }
  };
  const job = generate();
  pending.set(key, job);
  try {
    return { audio: await job, voice, cached: false };
  } finally {
    pending.delete(key);
  }
}
