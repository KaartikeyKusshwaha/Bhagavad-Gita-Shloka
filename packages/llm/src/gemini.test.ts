import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { geminiJson } from './gemini.ts';
import { validateCitedAnswer } from './provider.ts';
import { parseExploreReply } from '../../shared/src/device-data.ts';
const schema = z.object({ text: z.string() });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function configure() {
  vi.stubEnv('GEMINI_API_KEY', 'synthetic-key');
}
it('uses nonstored structured Interactions, keeps thoughts private and validates the completed output', async () => {
  configure();
  const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect(body.store).toBe(false);
    expect(body.tools).toBeUndefined();
    expect(body.previous_interaction_id).toBeUndefined();
    expect(body.response_format.mime_type).toBe('application/json');
    expect(body.generation_config.max_output_tokens).toBe(8192);
    return new Response(
      JSON.stringify({
        status: 'completed',
        steps: [
          { type: 'thought', content: [{ text: 'private thought must not appear' }] },
          {
            type: 'model_output',
            content: [{ type: 'text', text: '{"text":"Evidence explanation"}' }],
          },
        ],
      }),
    );
  });
  vi.stubGlobal('fetch', fetcher);
  expect(await geminiJson('Explain', {}, schema)).toEqual({ text: 'Evidence explanation' });
  expect(fetcher).toHaveBeenCalledOnce();
});
it('rejects incomplete output, quota exhaustion and invalid JSON without trying a substitute provider', async () => {
  configure();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'incomplete', output_text: '{"text":"Partial"}' })),
    )
    .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'retry-after': '64231' } }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'completed', output_text: 'not JSON' })),
    );
  vi.stubGlobal('fetch', fetcher);
  await expect(geminiJson('Explain', {}, schema)).rejects.toMatchObject({ code: 'AI_INCOMPLETE' });
  await expect(geminiJson('Explain', {}, schema)).rejects.toMatchObject({
    code: 'AI_RATE_LIMITED',
    message: expect.stringContaining('18 hour(s)'),
  });
  await expect(geminiJson('Explain', {}, schema)).rejects.toMatchObject({
    code: 'AI_INVALID_RESPONSE',
  });
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it('accepts long cited answers and saves their assessment and public source metadata', () => {
  const source = {
    id: 'web:fixture',
    title: 'Synthetic public report',
    url: 'https://scholar.lib.vt.edu/fixture',
    retrieved_at: new Date().toISOString(),
    kind: 'referenced_report' as const,
    attribution: 'Synthetic contract fixture',
    text: 'A documented fixture event.',
  };
  const paragraphs = Array.from({ length: 8 }, () => ({
    text: 'A developed interpretation grounded in the report. '.repeat(30),
    citations: [source.id],
  }));
  const checked = validateCitedAnswer({ paragraphs }, [], [source]);
  const reply = parseExploreReply({
    web_sources: [source],
    answer: {
      ...checked,
      model: 'synthetic-model',
      assessment: { verdict: 'mixed', scope: 'historical' },
    },
  });
  expect(reply.answer?.paragraphs).toHaveLength(8);
  expect(reply.answer?.assessment?.verdict).toBe('mixed');
  expect(reply.web_sources?.[0].url).toBe(source.url);
  expect(reply.web_sources?.[0]).not.toHaveProperty('text');
  expect(() =>
    validateCitedAnswer(
      { paragraphs: [{ text: 'Invented fact.', citations: ['web:invented'] }] },
      [],
      [source],
    ),
  ).toThrow();
  expect(() =>
    validateCitedAnswer(
      { paragraphs: [{ text: 'It says “made up quotation”.', citations: [source.id] }] },
      [],
      [source],
    ),
  ).toThrow();
});
