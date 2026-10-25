import { afterEach, expect, it, vi } from 'vitest';
import type { Passage } from '../../shared/src/index.ts';
import type { Database } from '../../db/src/index.ts';
const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  get: vi.fn(),
  context: vi.fn(),
  works: vi.fn(),
  ready: vi.fn(),
  generate: vi.fn(),
}));
vi.mock('../../search/src/index.ts', () => ({ searchPassages: mocks.search }));
vi.mock('../../db/src/queries.ts', () => ({
  getPassage: mocks.get,
  getContext: mocks.context,
  getWorks: mocks.works,
}));
vi.mock('../../llm/src/provider.ts', () => ({
  modelConfigured: mocks.ready,
  generateCitedAnswer: mocks.generate,
  modelName: () => 'fixture-model',
  canUseAI: (p: Passage) => p.source.display_rules.no_generative_ai !== true,
}));
import { verifyClaim } from './index.ts';
afterEach(() => vi.resetAllMocks());
const p = {
  id: 'bg.2.47',
  ref: 'BG 2.47',
  work: 'bhagavad-gita',
  original_text: 'A synthetic source sentence.',
  transliteration: '',
  translations: [],
  source: { display_rules: {} },
} as unknown as Passage;
function setup() {
  mocks.search.mockResolvedValue(
    Array.from({ length: 5 }, (_, i) => ({
      passage: { ...p, id: `other.${i}` },
      score: 0.5,
      match_type: 'fuzzy',
    })),
  );
  mocks.get.mockResolvedValue(p);
  mocks.context.mockResolvedValue({ before: [], after: [] });
  mocks.works.mockResolvedValue([{ tradition: 'hinduism' }]);
  mocks.ready.mockReturnValue(true);
}
it('keeps the claimed passage visible even behind several lexical hits, and returns a separate cited AI assessment', async () => {
  setup();
  mocks.generate.mockResolvedValue({
    paragraphs: [{ text: 'This evidence does not support avoiding work.', citations: [p.id] }],
  });
  const result = await verifyClaim(
    {} as Database,
    'Does BG 2.47 teach that we should avoid all work?',
  );
  if (!('verdict' in result)) throw new Error('Unexpected safety response');
  expect(result.matches[0].passage.id).toBe(p.id);
  expect(result.answer?.paragraphs[0].citations).toContain(p.id);
  expect(result.verdict).toBe('not_found');
  expect(result.explanation_kind).toBe('deterministic_text_check');
});
it('fails explicitly on provider failure without publishing a substitute assessment', async () => {
  setup();
  mocks.generate.mockRejectedValue(new Error('MODEL_UNAVAILABLE'));
  await expect(
    verifyClaim({} as Database, 'Does BG 2.47 teach avoiding work?'),
  ).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE' });
});
it('requires a configured model for an AI assessment', async () => {
  setup();
  mocks.ready.mockReturnValue(false);
  await expect(verifyClaim({} as Database, 'Explain BG 2.47')).rejects.toMatchObject({
    code: 'AI_UNAVAILABLE',
  });
  expect(mocks.generate).not.toHaveBeenCalled();
});
it('never sends a restricted edition to the model', async () => {
  setup();
  const restricted = { ...p, source: { ...p.source, display_rules: { no_generative_ai: true } } };
  mocks.search.mockResolvedValue([]);
  mocks.get.mockResolvedValue(restricted);
  const result = await verifyClaim({} as Database, 'Explain BG 2.47');
  if (!('verdict' in result)) throw new Error('Unexpected safety response');
  expect(mocks.generate).not.toHaveBeenCalled();
  expect(result.note).toContain('do not permit AI');
});
