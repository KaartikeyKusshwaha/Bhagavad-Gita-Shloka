'use client';
const values = new Map<string, string>();
let account = false;
export function personalGet(key: string) {
  return account ? (values.get(key) ?? null) : localStorage.getItem(key);
}
export function personalSet(key: string, value: string) {
  if (account) values.set(key, value);
  else localStorage.setItem(key, value);
}
export function accountStorage(device: unknown, learning: unknown) {
  account = true;
  values.set('open-scripture-device-v1', JSON.stringify(device));
  values.set('open-scripture-learning-v1', JSON.stringify(learning));
  window.dispatchEvent(new Event('scripture-device-change'));
  window.dispatchEvent(new Event('scripture-learning-change'));
}
