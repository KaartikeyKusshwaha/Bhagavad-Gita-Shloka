import { z } from 'zod';
import type { Passage, SearchHit } from './index.ts';

export type ExploreMode = 'search' | 'verify' | 'ask';
export interface ExploreReply {
  hits?: SearchHit[];
  matches?: { passage: Passage }[];
  passages?: SearchHit[];
  verdict?: string;
  explanation?: string;
  note?: string;
  coverage_note?: string;
  safety?: { kind: string; message?: string };
}
export interface ExploreTurn {
  id: string;
  query: string;
  mode: ExploreMode;
  work?: string;
  at: string;
  reply: ExploreReply;
}
export interface ExploreConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: ExploreTurn[];
}
export interface StudyBookmark {
  id: string;
  ref: string;
  work: string;
  title: string;
  preview: string;
  savedAt: string;
}
export interface LearningActivity {
  day: string;
  kind: 'read' | 'search' | 'verify' | 'ask' | 'practice';
  resource: string;
}
export interface DeviceData {
  version: 1;
  rememberHistory: boolean;
  conversations: ExploreConversation[];
  bookmarks: StudyBookmark[];
  readPassages: string[];
  activity: LearningActivity[];
}
export const emptyDeviceData: DeviceData = {
  version: 1,
  rememberHistory: true,
  conversations: [],
  bookmarks: [],
  readPassages: [],
  activity: [],
};
const timestamp = z.iso.datetime({ offset: true });
const mode = z.enum(['search', 'verify', 'ask']);
const webUrl = z
  .string()
  .url()
  .regex(/^https?:\/\//i);
const source = z
  .object({
    id: z.string(),
    name: z.string(),
    url: webUrl,
    license: z.string(),
    license_url: webUrl,
  })
  .passthrough();
const passage = z
  .object({
    id: z.string(),
    ref: z.string(),
    work: z.string(),
    work_title: z.string(),
    tradition: z.string(),
    tradition_name: z.string(),
    original_text: z.string(),
    original_script: z.string(),
    transliteration: z.string(),
    ordinal: z.number(),
    verse_number: z.number(),
    chapter: z.number(),
    division_id: z.string(),
    source,
    audio: z
      .array(
        z.object({
          id: z.string(),
          passage_id: z.string(),
          reciter: z.string(),
          lang: z.string(),
          url: webUrl,
          duration_ms: z.number(),
          license: z.string(),
          is_human: z.literal(true),
          source,
        }),
      )
      .max(10)
      .optional(),
    translations: z
      .array(
        z
          .object({
            id: z.string(),
            lang: z.string(),
            translator: z.string(),
            text: z.string(),
            is_machine: z.boolean(),
            source,
          })
          .passthrough(),
      )
      .max(100),
  })
  .passthrough();
const hit = z.object({
  passage,
  score: z.number(),
  match_type: z.enum(['exact', 'fuzzy', 'semantic', 'reference']),
});
const reply = z.object({
  hits: z.array(hit).max(50).optional(),
  matches: z.array(z.object({ passage })).max(10).optional(),
  passages: z.array(hit).max(50).optional(),
  verdict: z.string().optional(),
  explanation: z.string().optional(),
  note: z.string().optional(),
  coverage_note: z.string().optional(),
  safety: z.object({ kind: z.string(), message: z.string().optional() }).optional(),
});
export function parseExploreReply(input: unknown): ExploreReply {
  return reply.parse(input) as ExploreReply;
}
const turnSchema = z.object({
  id: z.string().max(100),
  query: z.string().max(5000),
  mode,
  work: z.string().max(150).optional(),
  at: timestamp,
  reply,
});
const deviceSchema = z.object({
  version: z.literal(1),
  rememberHistory: z.boolean(),
  conversations: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().max(120),
        createdAt: timestamp,
        updatedAt: timestamp,
        turns: z.array(turnSchema).max(40),
      }),
    )
    .max(100),
  bookmarks: z
    .array(
      z.object({
        id: z.string().max(150),
        ref: z.string().max(150),
        work: z.string().max(150),
        title: z.string().max(200),
        preview: z.string().max(500),
        savedAt: timestamp,
      }),
    )
    .max(2000),
  readPassages: z.array(z.string().max(150)).max(100000),
  activity: z
    .array(
      z.object({
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        kind: z.enum(['read', 'search', 'verify', 'ask', 'practice']),
        resource: z.string().max(150),
      }),
    )
    .max(50000),
});

export function parseDeviceData(raw: string | null): DeviceData {
  if (!raw) return { ...emptyDeviceData };
  return deviceSchema.parse(JSON.parse(raw)) as DeviceData;
}
/** Calendar day in the reader's local timezone; UTC conversion would shift late-night study. */
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function addActivity(
  state: DeviceData,
  kind: LearningActivity['kind'],
  resource: string,
  date = new Date(),
): DeviceData {
  const day = localDay(date);
  if (state.activity.some((a) => a.day === day && a.kind === kind && a.resource === resource))
    return state;
  const cutoff = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 370);
  return {
    ...state,
    activity: [
      ...state.activity.filter((a) => a.day >= localDay(cutoff)),
      { day, kind, resource },
    ].slice(-50000),
  };
}
/** Bound personal history to 90 days, 100 threads, 40 turns/thread and a storage budget. */
export function retainHistory(state: DeviceData, now = new Date(), budget = 750000): DeviceData {
  const cutoff = now.getTime() - 90 * 24 * 60 * 60 * 1000;
  let conversations = state.conversations
    .filter((c) => new Date(c.updatedAt).getTime() >= cutoff)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 100)
    .map((c) => ({ ...c, turns: c.turns.slice(-40) }));
  while (JSON.stringify(conversations).length > budget && conversations.length) {
    if (conversations.length > 1) conversations = conversations.slice(0, -1);
    else if (conversations[0].turns.length > 1)
      conversations = [{ ...conversations[0], turns: conversations[0].turns.slice(1) }];
    else conversations = [];
  }
  return { ...state, conversations };
}
export function saveExploreTurn(
  state: DeviceData,
  threadId: string,
  turn: ExploreTurn,
  now = new Date(),
): DeviceData {
  if (!state.rememberHistory || turn.reply.safety) return state;
  const existing = state.conversations.find((c) => c.id === threadId);
  if (existing?.turns.some((t) => t.id === turn.id)) return state;
  const thread: ExploreConversation = existing
    ? { ...existing, updatedAt: turn.at, turns: [...existing.turns, turn] }
    : {
        id: threadId,
        title: turn.query.replace(/\s+/g, ' ').slice(0, 80),
        createdAt: turn.at,
        updatedAt: turn.at,
        turns: [turn],
      };
  return retainHistory(
    { ...state, conversations: [thread, ...state.conversations.filter((c) => c.id !== threadId)] },
    now,
  );
}
export function activityDays(state: DeviceData): Map<string, LearningActivity[]> {
  const days = new Map<string, LearningActivity[]>();
  for (const event of state.activity) days.set(event.day, [...(days.get(event.day) ?? []), event]);
  return days;
}
export function learningStats(state: DeviceData, today = new Date()) {
  const days = activityDays(state);
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const week = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  return {
    streak,
    activeDays: days.size,
    read: state.readPassages.length,
    thisWeek: state.activity.filter((a) => a.day >= localDay(week) && a.day <= localDay(today))
      .length,
  };
}
export function calendarDays(
  today = new Date(),
  weeks = 53,
): { day: string; date: Date; future: boolean }[] {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { day: localDay(date), date, future: date > end };
  });
}
