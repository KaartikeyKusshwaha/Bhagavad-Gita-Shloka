import { test, expect } from './reader-fixture';

test('Explore Verify requires a real assessment and reports a service failure honestly', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const health = await (await request.get('/v1/health')).json();
  await page.goto('/');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Quotation to verify', exact: true })
    .fill('Does BG 2.47 teach that we should avoid all work?');
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  if (!health.capabilities.ai_explanations && process.env.REQUIRE_LIVE_AI !== '1') {
    await expect(page.getByRole('alert')).toContainText('No AI assessment was produced');
    await expect(page.locator('.assistant-response')).toHaveCount(0);
    return;
  }
  await expect(page.locator('.assistant-response')).toBeVisible({ timeout: 95000 });
  await expect(page.getByRole('article', { name: 'BG 2.47', exact: true })).toBeVisible();
  await expect(page.locator('.answer-citations a').first()).toBeVisible();
  await expect(
    page.getByText('AI study explanation · check the sources', { exact: true }),
  ).toBeVisible();
  await page.waitForFunction(() => document.body.dataset.accountSync === 'ready');
  await page.reload();
  await expect(page.locator('.assistant-response')).toBeVisible();
});

test('reader sessions save active minutes, exclude pauses, and restore preferences and bookmarks', async ({
  page,
  request,
}) => {
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await page.getByRole('button', { name: 'Bookmark to my account', exact: true }).click();
  await page.getByLabel('Reading text size', { exact: true }).selectOption('large');
  await page.getByLabel('Reading view', { exact: true }).selectOption('translation');
  await expect(page.locator('.scripture-block').first()).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Listen to translation', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Focus reading', exact: true }).click();
  await expect(page.locator('.chapter-sidebar')).toBeHidden();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start reading session', exact: true }).click();
  await page.clock.runFor(61000);
  await expect(page.getByLabel('Session elapsed time')).toHaveText('1:01');
  await page.getByRole('button', { name: 'Pause session', exact: true }).click();
  await page.clock.runFor(60000);
  await expect(page.getByLabel('Session elapsed time')).toHaveText('1:01');
  await page.getByRole('button', { name: 'Resume session', exact: true }).click();
  await page.evaluate(() =>
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }),
  );
  await page.clock.runFor(60000);
  await expect(page.getByLabel('Session elapsed time')).toHaveText('1:01');
  await page.evaluate(() =>
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    }),
  );
  await page.getByRole('button', { name: 'Pause session', exact: true }).click();
  await page.clock.resume();
  await page.waitForFunction(() => document.body.dataset.accountSync === 'ready');
  const saved = await (await request.get('/v1/account/data')).json();
  expect(
    saved.data.device.activity.filter((a: { kind: string }) => a.kind === 'reading'),
  ).toHaveLength(1);
  await page.goto('/study');
  await expect(page.getByText('reading minutes', { exact: false }).first()).toBeVisible();
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await expect(page.getByLabel('Reading text size', { exact: true })).toHaveValue('large');
  await expect(page.getByRole('button', { name: 'Remove bookmark', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/qa-reader-book-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'output/qa-reader-book-mobile.png', fullPage: true });
});
