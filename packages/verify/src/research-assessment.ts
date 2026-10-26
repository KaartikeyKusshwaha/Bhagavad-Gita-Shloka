import type { Database } from '../../db/src/index.ts';
import { getContext } from '../../db/src/queries.ts';
import { generateCitedAnswer, modelName } from '../../llm/src/provider.ts';
import { AiServiceError } from '../../llm/src/errors.ts';
import { planRetrieval, retrieveScripture } from '../../llm/src/retrieval.ts';
import { researchPublicSources } from '../../llm/src/research.ts';
import { parseClaim, searchThreeWays, assignVerdict, explain } from './index.ts';

export async function researchAssessment(db: Database, input: string, source?: string) {
  try {
    const plan = await planRetrieval(input, 'verify', [], source);
    const claim = parseClaim(input, source);
    const initial = plan.scope === 'historical' ? [] : await searchThreeWays(db, claim);
    const scripture =
      plan.scope === 'historical'
        ? { hits: [], evidence: [] }
        : await retrieveScripture(
            db,
            plan.scripture_queries,
            { work: source || claim.claimedWork },
            initial,
          );
    const web = plan.web_queries.length
      ? await researchPublicSources(plan.web_queries)
      : { sources: [], limitations: [] };
    const generated = await generateCitedAnswer(
      `Assess this claim and explain which components the evidence supports or contradicts: ${input}`,
      scripture.evidence,
      [],
      { claim: input, scope: plan.scope, web: web.sources, limitations: web.limitations },
    );
    const cited = new Set(generated.paragraphs.flatMap((p) => p.citations));
    const allPassages = [
      ...new Map(
        [...scripture.hits.map((h) => h.passage), ...scripture.evidence].map((p) => [p.id, p]),
      ).values(),
    ];
    const matches = await Promise.all(
      allPassages
        .filter((p) => cited.has(p.id))
        .slice(0, 12)
        .map(async (passage) => ({
          passage,
          score: 1,
          match_type: 'reference' as const,
          context: await getContext(db, passage, 1, 1),
        })),
    );
    const decision = assignVerdict(claim, scripture.hits);
    return {
      ...decision,
      matches,
      answer: { ...generated, model: modelName('chat') },
      web_sources: web.sources.map(({ text: _text, ...metadata }) => metadata),
      explanation:
        plan.scope === 'historical'
          ? 'Historical evidence check. Scripture quotation matching does not establish a modern event.'
          : explain(decision.verdict, decision.review_required),
      explanation_kind: 'deterministic_text_check',
      note: 'AI assessment of retrieved evidence. Open the cited sources and check their context; this is not a scholarly ruling.',
      coverage_note: plan.web_queries.length
        ? `Public-source discovery uses English Wikipedia and accessible references on selected public publishers; it does not search the whole web. ${web.sources.length} sources retrieved. ${web.limitations.join(' ')}`
        : 'The assessment covers retrieved passages from the loaded editions, not every scripture or translation.',
      quote_check: 'pass' as const,
      lang: claim.lang,
    };
  } catch (error) {
    throw error instanceof AiServiceError
      ? error
      : new AiServiceError(
          'AI_INVALID_RESPONSE',
          'The assessment did not pass evidence checks. No substitute answer was published. Please retry.',
        );
  }
}
