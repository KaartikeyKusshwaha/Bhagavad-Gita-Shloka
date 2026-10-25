import { it, expect } from 'vitest';
import { parseClaim, assignVerdict } from './index.ts';
import type { Passage } from '../../shared/src/index.ts';
it('parses source, quotation and reference without inventing text', () => {
  expect(parseClaim('The Gita says “sample existing wording” (BG 2.47)')).toEqual({
    quote: 'sample existing wording',
    claimedWork: 'bhagavad-gita',
    claimedRef: 'BG 2.47',
    lang: 'en',
  });
});
it('does not treat a fuzzy match or a reference alone as verified meaning', () => {
  const p = {
    work: 'bhagavad-gita',
    ref: 'BG 2.47',
    original_text: 'Known original wording',
    transliteration: '',
    translations: [],
  } as unknown as Passage;
  const hit = { passage: p, score: 0.8, match_type: 'fuzzy' as const };
  expect(assignVerdict({ quote: 'A different unconfirmed sentence', lang: 'en' }, [hit])).toEqual({
    verdict: 'not_found',
    review_required: true,
  });
  expect(
    assignVerdict({ quote: 'Known original wording', lang: 'en', claimedWork: 'quran' }, [hit])
      .verdict,
  ).toBe('misattributed');
});
it('resolves references across the full library rather than defaulting a Bible or Jain reference to the Gita', () => {
  expect(parseClaim('Does Genesis 1.1 describe creation?').claimedWork).toBe('bible-genesis');
  expect(parseClaim('What does BG 2.47 teach?').claimedRef).toBe('BG 2.47');
});
