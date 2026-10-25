import { test as base, expect, type APIRequestContext } from '@playwright/test';
type StorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;
import { emptyDeviceData } from '../../packages/shared/src/device-data';
import { emptyLearning } from '../../packages/shared/src/account-data';
export const test = base.extend<{ readerAccount: void }, { memberState: StorageState }>({
  memberState: [
    async ({ playwright }, use) => {
      const api = await playwright.request.newContext({
        baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3100',
      });
      const password = 'isolated-browser-test-password',
        username = `e2e_${Date.now()}`;
      const created = await api.post('/v1/account/signup', {
        headers: { 'x-scripture-client': '1' },
        data: { username, name: 'Browser reader', password },
      });
      expect(created.status()).toBe(200);
      await use(await api.storageState());
      await api.delete('/v1/account', {
        headers: { 'x-scripture-client': '1' },
        data: { password },
      });
      await api.dispose();
    },
    { scope: 'worker' },
  ],
  readerAccount: [
    async ({ context, memberState }, use) => {
      await context.addCookies(memberState.cookies);
      const { user } = await (await context.request.get('/v1/account')).json();
      const { revision } = await (await context.request.get('/v1/account/data')).json();
      const reset = await context.request.put('/v1/account/data', {
        headers: { 'x-scripture-client': '1' },
        data: {
          accountId: user.id,
          revision,
          data: { device: emptyDeviceData, learning: emptyLearning },
        },
      });
      expect(reset.status()).toBe(200);
      await use();
      await context.setOffline(false);
    },
    { auto: true },
  ],
  request: async ({ context }, use) => {
    await use(context.request);
  },
});
export { expect };
