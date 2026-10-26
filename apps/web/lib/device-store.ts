'use client';
import { personalGet, personalSet } from './personal-storage';
import { useSyncExternalStore } from 'react';
import {
  emptyDeviceData,
  parseDeviceData,
  retainHistory,
  type DeviceData,
} from '@core/shared/src/device-data';
const KEY = 'open-scripture-device-v1',
  EVENT = 'scripture-device-change';
let cachedRaw: string | null | undefined,
  cachedState: DeviceData = emptyDeviceData;
function snapshot(): DeviceData {
  try {
    const raw = personalGet(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedState = retainHistory(parseDeviceData(raw));
    }
    return cachedState;
  } catch {
    return emptyDeviceData;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
export function useDeviceData() {
  return useSyncExternalStore(subscribe, snapshot, () => emptyDeviceData);
}
export function changeDeviceData(update: (state: DeviceData) => DeviceData) {
  // Parse again before mutation: malformed storage is preserved instead of silently replaced.
  const current = parseDeviceData(personalGet(KEY));
  const next = retainHistory(update(current));
  personalSet(KEY, JSON.stringify(next));
  cachedRaw = undefined;
  window.dispatchEvent(new Event(EVENT));
}
export function isHistorySaved() {
  return snapshot().rememberHistory;
}
