export const cartesiaLanguages = new Set(
  'en de es fr ja pt zh hi ko it nl pl ru sv tr tl bg ro ar cs el fi hr ms sk da ta uk hu no vi bn th he ka id te gu kn ml mr pa or ur'.split(
    ' ',
  ),
);
import type { Passage } from './index.ts';
export function sourceSpeechLanguage(p: Passage) {
  return String(p.original_lang ?? p.source.display_rules.lang ?? '');
}
