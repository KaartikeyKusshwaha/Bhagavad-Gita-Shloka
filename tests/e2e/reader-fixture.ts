import { test as base, expect } from '@playwright/test';
export const test = base.extend<{ readerAccount: void }>({
  readerAccount: [
    async ({ context }, use) => {
      const password = 'isolated-browser-test-password',
        username = `e2e_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const created = await context.request.post('/v1/account/signup', {
        headers: { 'x-scripture-client': '1' },
        data: { username, name: 'Browser reader', password },
      });
      expect(created.status()).toBe(200);
      await use();
      await context.setOffline(false);
      await context.request.delete('/v1/account', {
        headers: { 'x-scripture-client': '1' },
        data: { password },
      });
    },
    { auto: true },
  ],
  request: async ({ context }, use) => {
    await use(context.request);
  },
});
export { expect };
