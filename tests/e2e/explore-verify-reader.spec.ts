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
    await expect(page.locator('.explore-error[role="alert"]')).toContainText(
      'No AI assessment was produced',
    );
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

test('evidence-limit assessments keep related scripture separate and survive account history reload', async ({
  page,
  request,
}) => {
  const claim = 'A broadcaster aired a programme in 1993 about an ancient ship.';
  const passage = (await (await request.get('/v1/passages/bhagavad-gita/BG-2.47')).json()).passage;
  const explanation =
    'The retrieved scripture cannot establish this broadcast claim. Contemporary historical records would be needed.';
  await page.route('**/v1/verify', (route) =>
    route.fulfill({
      json: {
        verdict: 'not_found',
        matches: [{ passage }],
        answer: {
          model: 'synthetic-browser-contract-fixture',
          paragraphs: [],
          unresolved: { claim_excerpt: 'A broadcaster', explanation },
        },
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await page.getByRole('textbox', { name: 'Quotation to verify', exact: true }).fill(claim);
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  await expect(page.getByText('Not established from these texts', { exact: true })).toBeVisible();
  await expect(page.getByText(explanation, { exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'BG 2.47', exact: true })).toBeHidden();
  await expect(page.locator('.answer-citations a')).toHaveCount(0);
  await page.waitForFunction(() => document.body.dataset.accountSync === 'ready');
  await page.reload();
  await expect(page.getByText(explanation, { exact: true })).toBeVisible();
  await page
    .getByText('Related passages · not verification of this claim', { exact: true })
    .click();
  await expect(page.getByRole('article', { name: 'BG 2.47', exact: true })).toBeVisible();
});

test('historical assessments show source links and retain a developed answer after account history reload', async ({
  page,
}) => {
  const source = {
    id: 'web:synthetic',
    title: 'Synthetic report for interface testing',
    url: 'https://talkorigins.org/synthetic-test',
    kind: 'referenced_report',
    attribution: 'Synthetic contract fixture, not historical evidence',
    retrieved_at: new Date().toISOString(),
  };
  const paragraphs = Array.from({ length: 7 }, (_, index) => ({
    text: `Component ${index + 1}: ${'A detailed evidence explanation for this interface contract. '.repeat(15)}`,
    citations: [source.id],
  }));
  await page.route('**/v1/verify', (route) =>
    route.fulfill({
      json: {
        verdict: 'not_found',
        matches: [],
        web_sources: [source],
        answer: {
          model: 'synthetic-contract-model',
          assessment: { verdict: 'mixed', scope: 'historical' },
          paragraphs,
        },
      },
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Quotation to verify', exact: true })
    .fill('A synthetic historical claim for interface testing.');
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  await expect(
    page.getByText('Partly supported · qualifications matter', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.answer-citations a')).toHaveCount(7);
  await expect(page.locator('.answer-citations a').first()).toHaveAttribute('href', source.url);
  await expect(page.locator('.assistant-response')).not.toContainText(
    'No matching passage was found',
  );
  await page.waitForFunction(() => document.body.dataset.accountSync === 'ready');
  await page.reload();
  await expect(page.locator('.answer-citations a')).toHaveCount(7);
  await expect(page.getByText(paragraphs[6].text, { exact: true })).toBeVisible();
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
  await expect(page.getByText('Listen to original · Sanskrit', { exact: true })).toBeVisible();
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
