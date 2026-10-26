import { normalize } from '../../shared/src/index.ts';
export function routeSafety(input: string): {
  kind: 'distress' | 'generation' | 'ruling' | 'ranking' | 'ordinary';
  message?: string;
} {
  if (
    /suicid|kill myself|end my life|self[ -]?harm|hurt myself|abused|being abused|आत्महत्या|खुदकुशी|marna chahta|jeena nahi/i.test(
      input,
    )
  )
    return {
      kind: 'distress',
      message:
        'Your safety comes first. If you are in immediate danger, contact local emergency services or go to the nearest emergency department. Reach out to someone you trust who can stay with you. You can return to reading whenever you are ready.',
    };
  if (
    /(?:write|invent|complete|generate|create).{0,45}(?:new verse|scripture|shloka|surah|sacred verse)/i.test(
      input,
    )
  )
    return {
      kind: 'generation',
      message:
        'Scripture cannot be generated or completed here. Search the published texts or open a cited passage.',
    };
  if (
    /which religion.{0,15}(best|true|superior)|attack.{0,25}(religion|faith)|prove.{0,25}(inferior|false religion)/i.test(
      input,
    )
  )
    return {
      kind: 'ranking',
      message:
        'This platform does not rank or attack traditions. You can compare published passages and their sources.',
    };
  if (/fatwa|halakhic ruling|is it (haram|halal|permitted|forbidden)|am i allowed/i.test(input))
    return {
      kind: 'ruling',
      message:
        'Ask a qualified scholar of your tradition. This platform retrieves texts and does not give personal religious rulings.',
    };
  return { kind: 'ordinary' };
}
export function quoteExistsCheck(explanation: string, texts: string[]): boolean {
  const quoted = [...explanation.matchAll(/["“]([^"”]+)["”]/g)].map((x) => x[1]);
  const single = [...explanation.matchAll(/(?:^|\s)'([^'\n]+)'(?=\s|[.,;!?]|$)/g)].map((x) => x[1]);
  const blocks = [...explanation.matchAll(/^\s*>\s*(.+)$/gm)].map((x) => x[1]);
  return [...quoted, ...single, ...blocks].every((q) =>
    texts.some((t) => normalize(t).includes(normalize(q))),
  );
}
