'use client';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
const reference = z.object({
  id: z.string().max(150),
  work: z.string().max(150),
  ref: z.string().max(150),
  title: z.string().max(200),
});
const card = reference.extend({ due: z.iso.datetime(), level: z.number().int().min(0).max(6) });
const plan = z.object({
  work: z.string().max(150),
  title: z.string().max(200),
  daily: z.number().int().min(1).max(20),
  cursor: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  completedDay: z.string().optional(),
});
const schema = z.object({
  version: z.literal(1),
  revision: z.array(card).max(2000),
  plan: plan.nullable(),
});
export type RevisionCard = z.infer<typeof card>;
export type LearningData = z.infer<typeof schema>;
const empty: LearningData = { version: 1, revision: [], plan: null };
const KEY = 'open-scripture-learning-v1',
  EVENT = 'scripture-learning-change';
let raw: string | null | undefined,
  cached = empty;
function parse(text: string | null) {
  return text ? schema.parse(JSON.parse(text)) : empty;
}
function snapshot() {
  try {
    const text = localStorage.getItem(KEY);
    if (text !== raw) {
      raw = text;
      cached = parse(text);
    }
    return cached;
  } catch {
    return empty;
  }
}
function subscribe(fn: () => void) {
  window.addEventListener(EVENT, fn);
  window.addEventListener('storage', fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener('storage', fn);
  };
}
export function useLearningData() {
  return useSyncExternalStore(subscribe, snapshot, () => empty);
}
export function changeLearningData(update: (data: LearningData) => LearningData) {
  const next = schema.parse(update(parse(localStorage.getItem(KEY))));
  localStorage.setItem(KEY, JSON.stringify(next));
  raw = undefined;
  window.dispatchEvent(new Event(EVENT));
}
