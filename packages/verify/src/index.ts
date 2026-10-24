import type { Database } from '../../db/src/index.ts';
import { getContext, getPassage, getWorks } from '../../db/src/queries.ts';
import { searchPassages } from '../../search/src/index.ts';
import {
  normalize,
  coverageMessage,
  type Passage,
  type SearchHit,
  type Verdict,
} from '../../shared/src/index.ts';
import { routeSafety, quoteExistsCheck } from '../../llm/src/guardrails.ts';
export interface ParsedClaim {
  quote: string;
  claimedWork?: string;
  claimedRef?: string;
  lang: string;
}
export function parseClaim(input: string, source?: string): ParsedClaim {
  const quoted = input.match(/["“]([^"”]+)["”]/);
  const claimedWork =
    source ||
    (/\b(gita|bhagavad|गीता)\b/i.test(input)
      ? 'bhagavad-gita'
      : /\b(quran|koran|कुरान)\b/i.test(input)
        ? 'quran'
        : /\b(bible|gospel)\b/i.test(input)
          ? 'bible'
          : undefined);
  const reference = input.match(/(?:\bBG\s*|\b(?:verse|chapter)\s+)?(\d{1,2})[.:](\d{1,3})/i);
  const quote =
    quoted?.[1] ??
    input
      .replace(
        /^(?:(?:the\s+)?(?:bhagavad\s+)?gita|quran|bible)\s+(?:says?|states?|teaches?)\s*[:,-]?\s*/i,
        '',
      )
      .replace(/\bBG\s*\d+[.:]\d+\b/gi, '')
      .trim();
  return {
    quote,
    claimedWork,
    claimedRef: reference ? `BG ${Number(reference[1])}.${Number(reference[2])}` : undefined,
    lang: /[\u0900-\u097f]/.test(input) ? 'hi' : 'en',
  };
}
export async function searchThreeWays(db: Database, claim: ParsedClaim) {
  // Semantic retrieval is intentionally disabled until a real embedding worker is configured.
  const hits = await searchPassages(db, claim.quote, { limit: 10 });
  if (claim.claimedRef) {
    const p = await getPassage(db, claim.claimedWork ?? 'bhagavad-gita', claim.claimedRef);
    if (p && !hits.some((x) => x.passage.id === p.id))
      hits.push({ passage: p, score: 0, match_type: 'reference' });
  }
  return hits;
}
export async function fetchBest(db: Database, hits: SearchHit[]) {
  return Promise.all(
    hits.slice(0, 3).map(async (hit) => ({ ...hit, context: await getContext(db, hit.passage) })),
  );
}
export function assignVerdict(
  claim: ParsedClaim,
  hits: SearchHit[],
): { verdict: Verdict; review_required: boolean } {
  const quote = normalize(claim.quote);
  if (quote.length < 12) return { verdict: 'not_found', review_required: true };
  const exact = hits.find((hit) =>
    [
      hit.passage.original_text,
      hit.passage.transliteration,
      ...hit.passage.translations.map((t) => t.text),
    ].some((text) => normalize(text).includes(quote)),
  );
  if (exact) {
    if (claim.claimedWork && claim.claimedWork !== exact.passage.work)
      return { verdict: 'misattributed', review_required: false };
    if (claim.claimedRef && claim.claimedRef !== exact.passage.ref)
      return { verdict: 'misattributed', review_required: false };
    return { verdict: 'accurate', review_required: false };
  }
  return { verdict: 'not_found', review_required: hits.some((x) => x.score >= 0.35) };
}
export function explain(verdict: Verdict, review: boolean) {
  if (verdict === 'accurate')
    return 'The supplied wording occurs in the displayed primary text, transliteration, or named translation. This confirms a text match; read the surrounding passages before drawing conclusions about its meaning.';
  if (verdict === 'misattributed')
    return 'The wording occurs in the displayed passage, but its reference or work differs from the attribution supplied. Check the citation and the named edition below.';
  return review
    ? 'No exact quotation was confirmed. Related wording is shown for your review. A similarity match alone cannot establish a paraphrase, mistranslation, or an out-of-context claim.'
    : 'Not found in the texts we have loaded. This is a statement about the current collection, not proof that a quotation is false.';
}
export function passageTexts(passages: Passage[]) {
  return passages.flatMap((p) => [
    p.original_text,
    p.transliteration,
    ...p.translations.map((t) => t.text),
  ]);
}
export async function verifyClaim(db: Database, input: string, source?: string) {
  const safety = routeSafety(input);
  if (safety.kind !== 'ordinary')
    return { safety, matches: [], explanation: safety.message, quote_check: 'pass' as const };
  const claim = parseClaim(input, source),
    hits = await searchThreeWays(db, claim),
    matches = await fetchBest(db, hits);
  const decision = assignVerdict(claim, hits);
  const explanation = explain(decision.verdict, decision.review_required);
  const safe = quoteExistsCheck(explanation, passageTexts(matches.map((x) => x.passage)));
  const works = await getWorks(db);
  return {
    ...decision,
    matches,
    context: matches[0]?.context ?? { before: [], after: [] },
    explanation: safe ? explanation : 'Explanation withheld: could not verify its quotes.',
    explanation_kind: 'deterministic_text_check',
    quote_check: safe ? 'pass' : 'withheld',
    coverage_note: coverageMessage(new Set(works.map((x) => x.tradition)).size, works.length),
    capabilities: { exact: true, fuzzy: true, semantic: false, context_judgment: false },
    lang: claim.lang,
  };
}
