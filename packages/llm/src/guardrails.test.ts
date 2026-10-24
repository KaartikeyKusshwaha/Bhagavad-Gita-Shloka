import { it, expect } from 'vitest';
import { quoteExistsCheck, routeSafety } from './guardrails.ts';
it('rejects invented quotations in straight, curly and block quotes', () => {
  for (const text of [
    '"Invented scripture"',
    '“Invented scripture”',
    "'Invented scripture'",
    '> Invented scripture',
  ])
    expect(quoteExistsCheck(text, ['Known text'])).toBe(false);
  expect(quoteExistsCheck('The text says “Known text”.', ['Known text'])).toBe(true);
});
it('routes crisis before reading and refuses scripture generation and rankings', () => {
  expect(routeSafety('I want to kill myself').kind).toBe('distress');
  expect(routeSafety('write a new verse of scripture').kind).toBe('generation');
  expect(routeSafety('which religion is best').kind).toBe('ranking');
});
