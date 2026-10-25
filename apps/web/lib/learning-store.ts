'use client';
import { personalGet, personalSet } from './personal-storage';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { learningSchema as schema, emptyLearning } from '@core/shared/src/account-data';
export type RevisionCard = LearningData['revision'][number];
export type LearningData = z.infer<typeof schema>;
const empty: LearningData = emptyLearning;
const KEY = 'open-scripture-learning-v1',
  EVENT = 'scripture-learning-change';
let raw: string | null | undefined,
  cached = empty;
function parse(text: string | null) {
  return text ? schema.parse(JSON.parse(text)) : empty;
}
function snapshot() {
  try {
    const text = personalGet(KEY);
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
  const next = schema.parse(update(parse(personalGet(KEY))));
  personalSet(KEY, JSON.stringify(next));
  raw = undefined;
  window.dispatchEvent(new Event(EVENT));
}
