import type { Database } from '../../db/src/index.ts';
import { getPassageById, getPassage, getContext } from '../../db/src/queries.ts';
import { searchPassages } from '../../search/src/index.ts';
import type { SearchHit, Passage } from '../../shared/src/index.ts';
import { canUseAI, generateCitedAnswer, modelConfigured, modelName } from './provider.ts';
import { AiServiceError } from './errors.ts';
import { routeSafety } from './guardrails.ts';
import { findPassageReference } from '../../shared/src/references.ts';
import { usesGemini } from './gemini.ts';
import { planRetrieval, retrieveScripture } from './retrieval.ts';
export interface AskHistory {
  question: string;
  answer?: string;
  passage_ids: string[];
}
export async function askFromSources(
  db: Database,
  question: string,
  options: { work?: string; tradition?: string; history?: AskHistory[] } = {},
) {
  const history = (options.history ?? [])
    .filter((h) => routeSafety(h.question).kind === 'ordinary')
    .slice(-5);
  const followup = history.length > 0 && /\b(it|this|that|they|them|its|more)\b/i.test(question);
  const ref = findPassageReference(
    question,
    options.work ?? findPassageReference(history.at(-1)?.question ?? '')?.work,
  );
  const referenced = ref ? await getPassage(db, ref.work, ref.ref) : null;
  const reusable: SearchHit[] = [];
  if (!ref && followup)
    for (const id of (history.at(-1)?.passage_ids ?? []).slice(0, 3)) {
      const p = await getPassageById(db, id);
      if (
        p &&
        (!options.work || p.work === options.work) &&
        (!options.tradition || p.tradition === options.tradition)
      )
        reusable.push({ passage: p, score: 1, match_type: 'reference' });
    }
  if (usesGemini()) {
    if (!modelConfigured('chat')) throw new AiServiceError();
    if (referenced && !canUseAI(referenced))
      return {
        passages: [{ passage: referenced, score: 1, match_type: 'reference' as const }],
        answer: null,
        note: 'These edition sources are available for reading and word search. Their terms exclude this AI use.',
      };
    try {
      const focus = options.work ?? ref?.work ?? reusable[0]?.passage.work;
      const plan = await planRetrieval(
        question,
        'ask',
        history.map((h) => h.question),
        focus,
      );
      const seed =
        referenced &&
        (!options.work || referenced.work === options.work) &&
        (!options.tradition || referenced.tradition === options.tradition)
          ? [{ passage: referenced, score: 1, match_type: 'reference' as const }]
          : reusable;
      const retrieved = await retrieveScripture(
        db,
        plan.scripture_queries,
        { work: focus, tradition: options.tradition },
        seed,
      );
      const answer = await generateCitedAnswer(
        question,
        retrieved.evidence,
        history.map(
          (h) =>
            `${h.question}\nPrevious answer (context, not evidence): ${(h.answer ?? '').slice(0, 4500)}`,
        ),
      );
      const cited = new Set(answer.paragraphs.flatMap((p) => p.citations));
      const all = [
        ...new Map(
          [...retrieved.evidence, ...retrieved.hits.map((h) => h.passage)].map((p) => [p.id, p]),
        ).values(),
      ];
      return {
        passages: all
          .filter((p) => cited.has(p.id))
          .map((passage) => ({ passage, score: 1, match_type: 'reference' as const })),
        answer: answer.paragraphs.length ? { ...answer, model: modelName('chat') } : null,
        note: answer.paragraphs.length
          ? 'AI study explanation grounded in the cited editions. Prior exchanges provide context, not source evidence.'
          : 'The retrieved permitted editions did not provide sufficient evidence for an answer. Try a specific passage or narrower question.',
        review_required: true,
      };
    } catch (error) {
      throw error instanceof AiServiceError
        ? error
        : new AiServiceError(
            'AI_INVALID_RESPONSE',
            'The answer did not pass evidence checks. Please retry.',
          );
    }
  }
  const hits: SearchHit[] = ref
    ? referenced &&
      (!options.work || ref.work === options.work) &&
      (!options.tradition || referenced.tradition === options.tradition)
      ? [{ passage: referenced, score: 1, match_type: 'reference' }]
      : []
    : reusable.length
      ? reusable
      : await searchPassages(db, question, {
          work: options.work,
          tradition: options.tradition,
          limit: 5,
        });
  const retrieval = {
    passages: hits.slice(0, 8),
    answer: null,
    note: 'Insufficient source evidence for this question.',
  };
  if (!modelConfigured('chat')) throw new AiServiceError();
  const focusWork =
    options.work ??
    ref?.work ??
    (reusable.length
      ? hits.find((h) => history.at(-1)!.passage_ids.includes(h.passage.id))?.passage.work
      : undefined);
  const usable = hits
    .filter((h) => canUseAI(h.passage) && (!focusWork || h.passage.work === focusWork))
    .slice(0, 2);
  if (!usable.length)
    return {
      ...retrieval,
      note: hits.length
        ? 'These edition sources are available for reading and word search. Their terms exclude this AI use.'
        : 'No sufficient source evidence was retrieved. Try a specific passage or a shorter question.',
    };
  try {
    const passages: Passage[] = [];
    for (const hit of usable) {
      const context = await getContext(db, hit.passage, 1, 1);
      for (const p of [...context.before, hit.passage, ...context.after])
        if (canUseAI(p) && !passages.some((x) => x.id === p.id)) passages.push(p);
    }
    const evidence = passages.slice(0, 8);
    const answer = await generateCitedAnswer(
      question,
      evidence,
      history.map(
        (h) =>
          h.question +
          (h.answer ? `\nPrevious answer (context only, not source evidence): ${h.answer}` : ''),
      ),
    );
    if (!answer.paragraphs.length)
      return {
        ...retrieval,
        note: 'The retrieved evidence was insufficient for a cited explanation. Try a more specific question or read the surrounding passages.',
      };
    const citedIds = new Set(answer.paragraphs.flatMap((p) => p.citations));
    const cited: SearchHit[] = evidence
      .filter((p) => citedIds.has(p.id))
      .map(
        (p) =>
          hits.find((h) => h.passage.id === p.id) ?? {
            passage: p,
            score: 0,
            match_type: 'reference',
          },
      );
    return {
      passages: [...cited, ...hits.filter((h) => !citedIds.has(h.passage.id))].slice(0, 10),
      answer: { ...answer, model: modelName('chat') },
      note: 'AI study explanation. Check the cited edition and surrounding passages; this is not a religious ruling.',
      review_required: true,
    };
  } catch (error) {
    throw error instanceof AiServiceError
      ? error
      : new AiServiceError(
          'AI_INVALID_RESPONSE',
          'The AI response did not pass citation checks. No answer was published. Please retry.',
        );
  }
}
