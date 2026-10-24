import { it, expect } from 'vitest';
import type { Passage, Source } from '../../shared/src/index.ts';
import { canUseAI, validateCitedAnswer } from './provider.ts';
const source: Source = {
  id: 'fixture-source',
  name: 'Synthetic test fixture',
  url: 'https://example.com',
  license: 'CC0-1.0',
  license_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
  attribution: 'Synthetic test fixture, not scripture.',
  retrieved_at: '2026-10-25',
  checksum: '0'.repeat(64),
  status: 'approved',
  commercial_ok: true,
  display_rules: {},
};
const passage: Passage = {
  id: 'fixture.1',
  ref: 'Fixture 1',
  work: 'fixture',
  work_title: 'Synthetic test',
  tradition: 'other',
  tradition_name: 'Other',
  original_text: 'A known fixture sentence.',
  original_script: 'Latin',
  transliteration: '',
  ordinal: 1,
  verse_number: 1,
  chapter: 1,
  division_id: 'fixture.1',
  source,
  translations: [],
};
it('requires every AI paragraph citation and quoted wording to belong to the cited evidence', () => {
  expect(
    validateCitedAnswer(
      { paragraphs: [{ text: 'A plain study explanation.', citations: ['fixture.1'] }] },
      [passage],
    ).paragraphs,
  ).toHaveLength(1);
  expect(() =>
    validateCitedAnswer(
      { paragraphs: [{ text: 'A plain study explanation.', citations: ['invented.99'] }] },
      [passage],
    ),
  ).toThrow();
  expect(() =>
    validateCitedAnswer(
      { paragraphs: [{ text: 'BG 2.47 says an unrelated thing.', citations: ['fixture.1'] }] },
      [passage],
    ),
  ).toThrow();
  const other = { ...passage, id: 'fixture.2', original_text: 'A different recorded phrase.' };
  expect(() =>
    validateCitedAnswer(
      { paragraphs: [{ text: '“A different recorded phrase.”', citations: ['fixture.1'] }] },
      [passage, other],
    ),
  ).toThrow();
  expect(() =>
    validateCitedAnswer(
      { paragraphs: [{ text: 'See https://example.com', citations: ['fixture.1'] }] },
      [passage],
    ),
  ).toThrow();
});
it('excludes source editions that disallow model use', () => {
  const restricted = {
    ...passage,
    source: { ...source, display_rules: { no_generative_ai: true } },
  };
  expect(canUseAI(restricted)).toBe(false);
  expect(() =>
    validateCitedAnswer(
      { paragraphs: [{ text: 'A plain study explanation.', citations: [restricted.id] }] },
      [restricted],
    ),
  ).toThrow();
});
