import { createHash } from 'node:crypto';
import { z } from 'zod';
import { SpeechError } from './speech-error.ts';
export const sanskritModel = 'aura-prime';
let cached:
  { key: string; at: number; voices: { id: string; name: string; locale: string }[] } | undefined;
async function call(path: string, body?: unknown) {
  const key = process.env.YOURVOIC_API_KEY;
  if (!key) throw new SpeechError('SPEECH_UNAVAILABLE', 'Sanskrit speech is not configured.');
  let response: Response;
  try {
    response = await fetch(`https://yourvoic.com/api/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'X-API-Key': key, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(75000),
    });
  } catch {
    throw new SpeechError('SPEECH_CONNECTION', 'YourVoic could not be reached. Please retry.');
  }
  if (!response.ok)
    throw new SpeechError(
      response.status === 429
        ? 'SPEECH_PROVIDER_LIMIT'
        : response.status === 401 || response.status === 403
          ? 'SPEECH_CREDENTIALS'
          : 'SPEECH_PROVIDER_ERROR',
      response.status === 429
        ? 'YourVoic’s credit or request limit was reached. Saved audio remains available.'
        : response.status === 401 || response.status === 403
          ? 'YourVoic rejected the server credentials or model permission. Contact the maintainer.'
          : 'YourVoic could not generate Sanskrit audio. Please retry.',
    );
  return response;
}
export async function sanskritVoices() {
  const key = createHash('sha256')
    .update(process.env.YOURVOIC_API_KEY ?? '')
    .digest('hex');
  if (cached?.key === key && Date.now() - cached.at < 3600000) return cached.voices;
  const languages = z
    .object({ languages: z.array(z.object({ code: z.string() })) })
    .parse(await (await call('languages?model=aura-prime')).json());
  if (!languages.languages.some((l) => l.code === 'sa'))
    throw new SpeechError(
      'SPEECH_NO_SANSKRIT',
      'YourVoic does not currently list Sanskrit for this model. No substitute language will be used.',
    );
  const response = z
    .object({
      language: z.string(),
      voices: z.array(
        z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), name: z.string().max(100) }),
      ),
    })
    .parse(await (await call('voices?language=sa&model=aura-prime')).json());
  if (response.language !== 'sa')
    throw new SpeechError('SPEECH_NO_SANSKRIT', 'YourVoic did not return Sanskrit voices.');
  const voices = response.voices
    .sort((a, b) => Number(b.id === 'Vidvan') - Number(a.id === 'Vidvan'))
    .slice(0, 3)
    .map((v) => ({ ...v, locale: 'sa' }));
  if (!voices.length)
    throw new SpeechError('SPEECH_NO_SANSKRIT', 'No Sanskrit voices are available.');
  cached = { key, at: Date.now(), voices };
  return voices;
}
export async function generateSanskrit(text: string, voice: string) {
  return call('tts/generate', {
    text,
    voice,
    model: sanskritModel,
    language: 'sa',
    speed: 0.9,
    format: 'wav',
  });
}
