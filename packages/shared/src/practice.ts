import { normalize } from './index.ts';
export interface WordChange {
  kind: 'same' | 'missing' | 'extra' | 'substitution';
  expected?: string;
  actual?: string;
}
/** Word-level edit alignment, not a pronunciation assessment. */
export function compareRecall(expected: string, actual: string): WordChange[] {
  const a = normalize(expected).split(' ').filter(Boolean).slice(0, 500),
    b = normalize(actual).split(' ').filter(Boolean).slice(0, 500);
  const costs = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = 0; i <= a.length; i++) costs[i][0] = i;
  for (let j = 0; j <= b.length; j++) costs[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      costs[i][j] = Math.min(
        costs[i - 1][j] + 1,
        costs[i][j - 1] + 1,
        costs[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  const changes: WordChange[] = [];
  let i = a.length,
    j = b.length;
  while (i || j) {
    if (i && j && a[i - 1] === b[j - 1]) {
      changes.push({ kind: 'same', expected: a[--i], actual: b[--j] });
    } else if (i && j && costs[i][j] === costs[i - 1][j - 1] + 1) {
      changes.push({ kind: 'substitution', expected: a[--i], actual: b[--j] });
    } else if (i && costs[i][j] === costs[i - 1][j] + 1) {
      changes.push({ kind: 'missing', expected: a[--i] });
    } else {
      changes.push({ kind: 'extra', actual: b[--j] });
    }
  }
  return changes.reverse();
}
export function nextReview(level: number, rating: 'again' | 'good' | 'easy', now = new Date()) {
  const next = rating === 'again' ? 0 : Math.min(6, level + (rating === 'easy' ? 2 : 1));
  const days = [0, 1, 3, 7, 14, 30, 60][next];
  return {
    level: next,
    due: new Date(now.getTime() + (days ? days * 86400000 : 10 * 60000)).toISOString(),
  };
}
export function recallQuiz(text: string) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 6) return null;
  for (let i = Math.floor(words.length / 2); i < words.length - 1; i++) {
    const cue = words[i - 1],
      answer = words[i];
    if (words.filter((w) => w === cue).length !== 1) continue;
    const distractors = Array.from(new Set(words.filter((w) => w !== answer && w !== cue))).slice(
      0,
      2,
    );
    if (distractors.length < 2) continue;
    return { cue, answer, choices: [...distractors, answer].sort((a, b) => a.localeCompare(b)) };
  }
  return null;
}
