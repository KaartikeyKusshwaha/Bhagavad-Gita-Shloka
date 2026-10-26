import { expect, it } from 'vitest';
import { readLibraryManifest, readLibraryEdition } from '../packages/ingest/src/library.ts';
import { readQuranEnglish } from '../packages/ingest/src/quran-english.ts';
import { parsePassageReference, findPassageReference } from '../packages/shared/src/references.ts';
import { emptyDeviceData, parseDeviceData } from '../packages/shared/src/device-data.ts';
it('keeps expanded editions traceable, ordered and source-hashed', async () => {
  const { manifest, checksum } = await readLibraryManifest();
  const traditions = new Set<string>();
  for (const item of manifest.works) {
    const { data, sources } = await readLibraryEdition(item, checksum);
    traditions.add(data.work.tradition);
    expect(
      data.passages.every(
        (p) => Boolean(p.metadata?.source_url) && !p.original_text.includes('\ufffd'),
      ),
    ).toBe(true);
    expect(sources.every((s) => s.status === 'approved' && s.attribution.length > 20)).toBe(true);
    if (item.id === 'guru-granth-sahib') {
      expect(data.divisions).toHaveLength(1430);
      expect(data.passages[0].original_text).toContain('ੴ');
      expect(sources[0].display_rules.machine_translation_allowed).toBe(false);
    }
    if (item.id === 'bible-genesis')
      expect(data.passages[0].translations.some((t) => t.lang === 'hi')).toBe(true);
  }
  expect([...traditions]).toEqual(
    expect.arrayContaining([
      'hinduism',
      'christianity',
      'judaism',
      'buddhism',
      'sikhism',
      'jainism',
      'zoroastrianism',
      'taoism',
      'confucianism',
      'shinto',
      'bahai',
      'lds',
    ]),
  );
}, 30000);
it('maps English Quran to actual verse IDs and keeps its no-derivatives edition out of AI', async () => {
  const { data, source } = await readQuranEnglish();
  expect(data.translations).toHaveLength(6236);
  expect(data.translations[0].passage_id).toBe('quran.1.1');
  expect(source.display_rules.no_generative_ai).toBe(true);
  expect(source.display_rules.preserve_verbatim).toBe(true);
});
it('recognizes cross-tradition references without turning Bible references into Gita references', () => {
  expect(parsePassageReference('Genesis 1:1')).toEqual({
    work: 'bible-genesis',
    ref: 'Genesis 1.1',
  });
  expect(findPassageReference('Explain Tanakh Genesis 1:1')).toEqual({
    work: 'tanakh-genesis',
    ref: 'Tanakh Genesis 1.1',
  });
  expect(parsePassageReference('1:2', 'bible-genesis')).toEqual({
    work: 'bible-genesis',
    ref: 'Genesis 1.2',
  });
  expect(parsePassageReference('Quran 2:255')).toEqual({ work: 'quran', ref: 'Quran 2:255' });
  expect(parsePassageReference('Mahabharata 1.1.1')).toEqual({
    work: 'mahabharata',
    ref: 'Mahabharata 1.1.1',
  });
});
it('retains existing device saves and separately validates notes, markers and saved-context opt-in', () => {
  const legacy = {
    version: 1,
    rememberHistory: true,
    conversations: [],
    bookmarks: [],
    readPassages: [],
    activity: [],
  };
  expect(parseDeviceData(JSON.stringify(legacy)).useSavedContext).toBeUndefined();
  const data = {
    ...emptyDeviceData,
    useSavedContext: true,
    readingPlaces: [
      { work: 'bible-genesis', ref: 'Genesis 1.1', title: 'Genesis', at: '2026-10-25T00:00:00Z' },
    ],
    bookmarks: [
      {
        id: 'bible-genesis.1.1',
        ref: 'Genesis 1.1',
        work: 'bible-genesis',
        title: 'Genesis',
        preview: 'In the beginning',
        savedAt: '2026-10-25T00:00:00Z',
        color: 'sage',
        note: 'A private study note',
      },
    ],
  };
  expect(parseDeviceData(JSON.stringify(data)).bookmarks[0].note).toBe('A private study note');
  expect(() =>
    parseDeviceData(
      JSON.stringify({ ...data, bookmarks: [{ ...data.bookmarks[0], color: 'invalid' }] }),
    ),
  ).toThrow();
});
