import type { Database } from '../../db/src/index.ts';
import { getContext, getPassage, getWorks } from '../../db/src/queries.ts';
import { searchPassages } from '../../search/src/index.ts';
import { findPassageReference } from '../../shared/src/references.ts';
import {
  canUseAI,
  generateCitedAnswer,
  modelConfigured,
  modelName,
} from '../../llm/src/provider.ts';
import { AiServiceError } from '../../llm/src/errors.ts';
import {
  normalize,
  coverageMessage,
  type Passage,
  type SearchHit,
  type Verdict,
} from '../../shared/src/index.ts';
import { routeSafety, quoteExistsCheck } from '../../llm/src/guardrails.ts';
import { usesGemini } from '../../llm/src/gemini.ts';
import { researchAssessment } from './research-assessment.ts';
export interface ParsedClaim {
  quote: string;
  claimedWork?: string;
  claimedRef?: string;
  lang: string;
}
export function parseClaim(input: string, source?: string): ParsedClaim {
  // A quoted film/book title is part of the claim, not an alleged scripture quote.
  const quoted = [...input.matchAll(/["“]([^"”]+)["”]/g)].find(
    (m) => !/\b(?:titled|entitled|called|named)\s*$/i.test(input.slice(0, m.index)),
  );
  const claimedWork =
    source ||
    (/\b(gita|bhagavad|गीता)\b/i.test(input)
      ? 'bhagavad-gita'
      : /\b(quran|koran|कुरान)\b/i.test(input)
        ? 'quran'
        : /\b(bible|gospel)\b/i.test(input)
          ? 'bible'
          : /\b(dhp|dhammapada)\b/i.test(input)
            ? 'dhammapada'
            : undefined);
  const reference = findPassageReference(input, claimedWork);
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
    claimedWork: source || reference?.work || claimedWork,
    claimedRef: reference?.ref,
    lang: /[\u0900-\u097f]/.test(input) ? 'hi' : /[\u0600-\u06ff]/.test(input) ? 'ar' : 'en',
  };
}
export async function searchThreeWays(db: Database, claim: ParsedClaim) {
  const p = claim.claimedRef
    ? await getPassage(db, claim.claimedWork ?? 'bhagavad-gita', claim.claimedRef)
    : null;
  // A question with a reference already has its evidence. Do not run a costly
  // whole-library similarity scan over the entire question before showing it.
  if (
    p &&
    (findPassageReference(claim.quote, claim.claimedWork) ||
      /\?$/.test(claim.quote) ||
      /^explain\b/i.test(claim.quote))
  )
    return [{ passage: p, score: 1, match_type: 'reference' as const }];
  let hits: SearchHit[] = [];
  try {
    hits = await searchPassages(db, claim.quote, { limit: 10 });
  } catch (error) {
    if (!p) throw error;
  }
  if (p) {
    const existing = hits.findIndex((x) => x.passage.id === p.id);
    if (existing >= 0) hits.splice(existing, 1);
    hits.unshift({ passage: p, score: 1, match_type: 'reference' });
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
  if (usesGemini()) return researchAssessment(db, input, source);
  const claim = parseClaim(input, source),
    hits = await searchThreeWays(db, claim),
    matches = await fetchBest(db, hits);
  const decision = assignVerdict(claim, hits);
  const explanation = explain(decision.verdict, decision.review_required);
  const safe = quoteExistsCheck(explanation, passageTexts(matches.map((x) => x.passage)));
  // The model interprets retrieved evidence; it never changes the text-match verdict.
  let answer = null;
  let note = '';
  const evidence = [
    ...new Map(
      matches
        .flatMap((m) => [m.passage, ...m.context.before.slice(-1), ...m.context.after.slice(0, 1)])
        .filter(canUseAI)
        .map((p) => [p.id, p]),
    ).values(),
  ].slice(0, 8);
  if (!evidence.length && matches.length) {
    note = 'The retrieved editions do not permit AI use. Read the text-match evidence below.';
  } else {
    if (!modelConfigured('chat')) throw new AiServiceError();
    try {
      const generated = await generateCitedAnswer(
        `Assess this claim against the supplied source evidence: ${input}\nClaimed source: ${source ?? claim.claimedWork ?? 'unspecified'}. Text-match result: ${decision.verdict}. Explain whether these passages support, contradict, or leave the claim unresolved, and why. Distinguish wording from interpretation. Do not claim universal religious or historical truth.`,
        evidence,
        [],
        { claim: input },
      );
      if (generated.paragraphs.length || generated.unresolved) {
        answer = { ...generated, model: modelName('chat') };
        const cited = new Set(generated.paragraphs.flatMap((p) => p.citations));
        for (const p of evidence.filter((p) => cited.has(p.id)))
          if (!matches.some((m) => m.passage.id === p.id))
            matches.push({
              passage: p,
              score: 0,
              match_type: 'reference',
              context: await getContext(db, p, 1, 1),
            });
        note = generated.unresolved
          ? 'This result does not establish whether the claim is true or false beyond the retrieved texts.'
          : 'AI evidence assessment, not a scholarly verdict. Check the cited edition and context.';
      } else
        note =
          'The model could not establish this claim from the retrieved evidence. The text check remains available.';
    } catch (error) {
      throw error instanceof AiServiceError
        ? error
        : new AiServiceError(
            'AI_INVALID_RESPONSE',
            'The AI assessment did not pass citation checks. No assessment was published. Please retry.',
          );
    }
  }
  const works = await getWorks(db);
  return {
    ...decision,
    matches,
    context: matches[0]?.context ?? { before: [], after: [] },
    explanation: safe ? explanation : 'Explanation withheld: could not verify its quotes.',
    explanation_kind: 'deterministic_text_check',
    answer,
    note,
    quote_check: safe ? 'pass' : 'withheld',
    coverage_note: coverageMessage(new Set(works.map((x) => x.tradition)).size, works.length),
    capabilities: {
      exact: true,
      fuzzy: true,
      ai_assessment: Boolean(answer),
      context_judgment: 'unreviewed_ai_assessment',
    },
    lang: claim.lang,
  };
}
