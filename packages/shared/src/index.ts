export function normalize(text: string): string {
  // Strip Latin diacritics only: Devanagari vowel signs are meaningful and must survive.
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[À-žḀ-ỿ]/g, (c) => c.normalize('NFD').replace(/\p{M}/gu, ''))
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export interface Source extends Record<string, unknown> {
  id: string;
  name: string;
  url: string;
  license: string;
  license_url: string;
  attribution: string;
  retrieved_at: string;
  checksum: string;
  status: 'draft' | 'approved' | 'blocked';
  commercial_ok: boolean;
  display_rules: Record<string, unknown>;
}
export interface Translation extends Record<string, unknown> {
  id: string;
  lang: string;
  translator: string;
  text: string;
  is_machine: boolean;
  source: Source;
}
export interface Passage extends Record<string, unknown> {
  id: string;
  ref: string;
  work: string;
  work_title: string;
  tradition: string;
  tradition_name: string;
  original_text: string;
  original_script: string;
  transliteration: string;
  ordinal: number;
  verse_number: number;
  chapter: number;
  division_id: string;
  source: Source;
  translations: Translation[];
}
export type Verdict =
  | 'accurate'
  | 'paraphrase'
  | 'out_of_context'
  | 'misattributed'
  | 'mistranslated'
  | 'disputed_reading'
  | 'not_found';
export interface SearchHit {
  passage: Passage;
  score: number;
  match_type: 'exact' | 'fuzzy' | 'semantic' | 'reference';
}
export const coverageMessage = (traditions: number, works: number) =>
  `Searched ${traditions} tradition${traditions === 1 ? '' : 's'}, ${works} work${works === 1 ? '' : 's'}. Results apply only to the approved texts loaded here.`;
export const traditionRegistry = [
  ['hinduism', 'Hinduism'],
  ['islam', 'Islam'],
  ['christianity', 'Christianity'],
  ['sikhism', 'Sikhism'],
  ['judaism', 'Judaism'],
  ['buddhism', 'Buddhism'],
  ['jainism', 'Jainism'],
  ['zoroastrianism', 'Zoroastrianism'],
  ['taoism', 'Taoism'],
  ['confucianism', 'Confucianism'],
  ['shinto', 'Shinto'],
  ['bahai', 'Baháʼí'],
  ['lds', 'Latter-day Saints'],
  ['other', 'Other'],
] as const;
