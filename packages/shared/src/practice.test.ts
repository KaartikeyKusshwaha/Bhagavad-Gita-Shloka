import { it, expect } from 'vitest';
import { compareRecall, nextReview, recallQuiz } from './practice.ts';
import { encodeLesson, decodeLesson } from './lessons.ts';
it('aligns an omitted word and a replacement without cascading text differences', () => {
  expect(compareRecall('alpha beta gamma delta', 'alpha gamma theta')).toEqual([
    { kind: 'same', expected: 'alpha', actual: 'alpha' },
    { kind: 'missing', expected: 'beta' },
    { kind: 'same', expected: 'gamma', actual: 'gamma' },
    { kind: 'substitution', expected: 'delta', actual: 'theta' },
  ]);
  expect(compareRecall('माता', 'मता').some((c) => c.kind !== 'same')).toBe(true);
});
it('resets a missed review and spaces later successful reviews', () => {
  const now = new Date('2026-10-24T12:00:00Z');
  expect(nextReview(5, 'again', now)).toEqual({ level: 0, due: '2026-10-24T12:10:00.000Z' });
  expect(nextReview(1, 'good', now)).toEqual({ level: 2, due: '2026-10-27T12:00:00.000Z' });
});
it('builds a quiz only from recorded words and a unique neighbouring word', () => {
  const text = 'one two three four five six seven eight',
    quiz = recallQuiz(text)!;
  expect(text.split(' ').indexOf(quiz.answer)).toBe(text.split(' ').indexOf(quiz.cue) + 1);
  expect(quiz.choices).toContain(quiz.answer);
  expect(quiz.choices.every((word) => text.split(' ').includes(word))).toBe(true);
  expect(recallQuiz('too short')).toBeNull();
});
it('shares a multilingual reference-only lesson and rejects unbounded or malformed payloads', () => {
  const lesson = {
    version: 1 as const,
    title: 'धर्म · Study',
    passages: [{ work: 'quran', ref: 'Quran 2:255' }],
    questions: ['What is the context?'],
  };
  expect(decodeLesson(encodeLesson(lesson))).toEqual(lesson);
  expect(() => decodeLesson('x'.repeat(12001))).toThrow();
  expect(() =>
    encodeLesson({ ...lesson, passages: [{ work: 'https://example.com', ref: 'external' }] }),
  ).toThrow();
});
