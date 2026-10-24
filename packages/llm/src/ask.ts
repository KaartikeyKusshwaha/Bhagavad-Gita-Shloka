import type { Database } from '../../db/src/index.ts';
import { getPassageById, getPassage, getContext } from '../../db/src/queries.ts';
import { searchPassages } from '../../search/src/index.ts';
import type { SearchHit, Passage } from '../../shared/src/index.ts';
import { canUseAI, generateCitedAnswer, modelReady, modelName } from './provider.ts';
import { routeSafety } from './guardrails.ts';
import { findPassageReference } from '../../shared/src/references.ts';
export interface AskHistory {
  question: string;
  answer?: string;
  passage_ids: string[];
}
let answering = false;
export async function askFromSources(
  db: Database,
  question: string,
  options: { work?: string; tradition?: string; history?: AskHistory[] } = {},
) {
  const history = (options.history ?? [])
    .filter((h) => routeSafety(h.question).kind === 'ordinary')
    .slice(-5);
  const contextual =
    history.length && /\b(it|this|that|they|them|its|more|explain|why|how)\b/i.test(question)
      ? `${history.at(-1)!.question}\nFollow-up: ${question}`
      : question;
  const ref = findPassageReference(
    question,
    options.work ?? findPassageReference(history.at(-1)?.question ?? '')?.work,
  );
  const referenced = ref ? await getPassage(db, ref.work, ref.ref) : null;
  const hits: SearchHit[] = ref
    ? referenced &&
      (!options.work || ref.work === options.work) &&
      (!options.tradition || referenced.tradition === options.tradition)
      ? [{ passage: referenced, score: 1, match_type: 'reference' }]
      : []
    : await searchPassages(db, contextual, {
        work: options.work,
        tradition: options.tradition,
        limit: 5,
      });
  for (const id of (ref ? [] : (history.at(-1)?.passage_ids ?? [])).slice(0, 3)) {
    if (hits.some((h) => h.passage.id === id)) continue;
    const p = await getPassageById(db, id);
    if (
      p &&
      (!options.work || p.work === options.work) &&
      (!options.tradition || p.tradition === options.tradition)
    )
      hits.unshift({ passage: p, score: 0, match_type: 'reference' });
  }
  const retrieval = {
    passages: hits.slice(0, 8),
    answer: null,
    note: 'Retrieved passages for study. An AI explanation is unavailable; read the source and context.',
  };
  if (!(await modelReady('chat'))) return retrieval;
  const focusWork =
    options.work ??
    ref?.work ??
    (history.length
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
  if (answering)
    return {
      ...retrieval,
      note: 'The explanation service is busy. Your source passages are available; try again shortly.',
    };
  answering = true;
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
  } catch {
    return {
      ...retrieval,
      note: 'The AI explanation could not be safely validated or completed. The retrieved passages remain available.',
    };
  } finally {
    answering = false;
  }
}
