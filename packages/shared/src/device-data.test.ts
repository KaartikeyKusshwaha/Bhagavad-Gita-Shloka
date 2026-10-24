import { describe, it, expect } from 'vitest';
import {
  addActivity,
  calendarDays,
  emptyDeviceData,
  learningStats,
  localDay,
  parseDeviceData,
  retainHistory,
  saveExploreTurn,
  type DeviceData,
  type ExploreTurn,
} from './device-data.ts';
const now = new Date('2026-10-24T12:00:00Z');
const turn: ExploreTurn = {
  id: 'turn-1',
  query: 'Where does this wording occur?',
  mode: 'search',
  at: now.toISOString(),
  reply: { hits: [] },
};
describe('private learning history', () => {
  it('stores an actual conversation, deduplicates submissions, and obeys paused history', () => {
    const saved = saveExploreTurn(emptyDeviceData, 'one', turn, now);
    expect(saved.conversations[0].turns).toHaveLength(1);
    expect(saveExploreTurn(saved, 'one', turn, now).conversations[0].turns).toHaveLength(1);
    expect(
      saveExploreTurn({ ...emptyDeviceData, rememberHistory: false }, 'one', turn, now)
        .conversations,
    ).toHaveLength(0);
    expect(
      saveExploreTurn(
        emptyDeviceData,
        'one',
        { ...turn, reply: { safety: { kind: 'distress' } } },
        now,
      ).conversations,
    ).toHaveLength(0);
  });
  it('removes expired history and bounds storage without changing bookmarks', () => {
    const state = saveExploreTurn(emptyDeviceData, 'one', turn, now);
    const old = { ...state.conversations[0], id: 'old', updatedAt: '2025-01-01T00:00:00Z' };
    expect(
      retainHistory(
        { ...state, conversations: [old, ...state.conversations] },
        now,
      ).conversations.map((c) => c.id),
    ).toEqual(['one']);
    expect(retainHistory(state, now, 5).conversations).toHaveLength(0);
    expect(() => parseDeviceData('{invalid')).toThrow();
    expect(() =>
      parseDeviceData(
        JSON.stringify({
          ...state,
          conversations: [
            { ...state.conversations[0], turns: [{ ...turn, reply: { hits: 'malformed' } }] },
          ],
        }),
      ),
    ).toThrow();
  });
  it('counts deliberate unique actions, not repeated passage views', () => {
    let state = addActivity(emptyDeviceData, 'read', 'bg.2.47', now);
    state = addActivity(state, 'read', 'bg.2.47', now);
    expect(state.activity).toHaveLength(1);
    state = addActivity(state, 'search', 'turn-1', now);
    expect(state.activity).toHaveLength(2);
  });
  it('calculates local calendar days and streaks across month/year boundaries', () => {
    const today = new Date(2026, 0, 1, 12);
    let state: DeviceData = { ...emptyDeviceData };
    for (const date of [new Date(2025, 11, 30, 12), new Date(2025, 11, 31, 12), today])
      state = addActivity(state, 'read', localDay(date), date);
    expect(learningStats(state, today).streak).toBe(3);
    expect(learningStats(state, new Date(2026, 0, 2, 12)).streak).toBe(3);
    expect(learningStats(state, new Date(2026, 0, 3, 12)).streak).toBe(0);
    const cells = calendarDays(today);
    expect(cells).toHaveLength(371);
    expect(cells[0].date.getDay()).toBe(0);
    expect(cells.filter((c) => c.day === localDay(today))).toHaveLength(1);
  });
});
