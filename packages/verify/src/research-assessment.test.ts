import { afterEach, expect, it, vi } from 'vitest';
import type { Database } from '../../db/src/index.ts';
const mocks = vi.hoisted(() => ({
  plan: vi.fn(),
  scripture: vi.fn(),
  web: vi.fn(),
  generate: vi.fn(),
  context: vi.fn(),
}));
vi.mock('../../llm/src/retrieval.ts', () => ({
  planRetrieval: mocks.plan,
  retrieveScripture: mocks.scripture,
}));
vi.mock('../../llm/src/research.ts', () => ({ researchPublicSources: mocks.web }));
vi.mock('../../db/src/queries.ts', () => ({ getContext: mocks.context }));
vi.mock('../../llm/src/provider.ts', () => ({
  generateCitedAnswer: mocks.generate,
  modelName: () => 'synthetic-gemini',
}));
vi.mock('./index.ts', () => ({
  parseClaim: () => ({ quote: 'synthetic', lang: 'en' }),
  searchThreeWays: async () => [],
  assignVerdict: () => ({ verdict: 'not_found', review_required: true }),
  explain: () => 'Wording check only.',
}));
import { researchAssessment } from './research-assessment.ts';
afterEach(() => vi.resetAllMocks());
it('uses public reports for historical claims without irrelevant scripture retrieval, strips cached report text from saved history', async () => {
  mocks.plan.mockResolvedValue({
    scope: 'historical',
    scripture_queries: [],
    web_queries: ['synthetic event'],
  });
  mocks.web.mockResolvedValue({
    sources: [
      {
        id: 'web:1',
        title: 'Report',
        url: 'https://talkorigins.org/test',
        text: 'Source prose',
        kind: 'referenced_report',
        retrieved_at: new Date().toISOString(),
        attribution: 'Synthetic',
      },
    ],
    limitations: [],
  });
  mocks.generate.mockResolvedValue({
    paragraphs: [{ text: 'A qualified conclusion.', citations: ['web:1'] }],
    assessment: { verdict: 'mixed', scope: 'historical' },
  });
  const reply = await researchAssessment({} as Database, 'A historical test claim.');
  expect(mocks.scripture).not.toHaveBeenCalled();
  expect(reply.answer.assessment?.verdict).toBe('mixed');
  expect(reply.verdict).toBe('not_found');
  expect(reply.web_sources[0]).not.toHaveProperty('text');
  expect(mocks.generate.mock.calls[0][3].web[0].text).toBe('Source prose');
});
it('does not contact public-source search for scripture-only assessment', async () => {
  mocks.plan.mockResolvedValue({
    scope: 'scripture',
    scripture_queries: ['duty'],
    web_queries: [],
  });
  mocks.scripture.mockResolvedValue({ hits: [], evidence: [] });
  mocks.generate.mockResolvedValue({
    paragraphs: [],
    assessment: { verdict: 'insufficient_evidence', scope: 'scripture' },
    unresolved: { claim_excerpt: 'Synthetic', explanation: 'No relevant evidence was retrieved.' },
  });
  const reply = await researchAssessment({} as Database, 'Synthetic teaching.');
  expect(reply.answer.assessment?.verdict).toBe('insufficient_evidence');
  expect(mocks.generate.mock.calls[0][3].web).toEqual([]);
  expect(mocks.web).not.toHaveBeenCalled();
});
it('surfaces source retrieval errors before inference rather than returning a substitute verdict', async () => {
  mocks.plan.mockResolvedValue({
    scope: 'historical',
    scripture_queries: [],
    web_queries: ['synthetic'],
  });
  mocks.web.mockRejectedValue(new Error('source unavailable'));
  await expect(
    researchAssessment({} as Database, 'A historical test claim.'),
  ).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });
  expect(mocks.generate).not.toHaveBeenCalled();
});
