import { test, expect } from './reader-fixture';
import AxeBuilder from '@axe-core/playwright';

test('additional editions keep their actual numbering, scripts and source notices', async ({
  page,
}) => {
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/library');
  await page.getByRole('link', { name: 'Begin reading Dhammapada', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Dhp 1', exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.getByLabel('Chapter', { exact: true }).selectOption('2');
  await expect(page.getByLabel('Verse', { exact: true }).locator('option').nth(1)).toHaveText('21');
  await page.getByLabel('Verse', { exact: true }).selectOption('21');
  await page.getByRole('button', { name: 'Open passage' }).click();
  await expect(page.getByRole('article', { name: 'Dhp 21', exact: true })).toBeVisible();
  await expect(page.getByText('Primary text · Pali', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/read/quran/Quran-2:255');
  await expect(page.getByRole('article', { name: 'Quran 2:255', exact: true })).toBeVisible();
  await expect(page.locator('.arabic-text')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.arabic-text')).toHaveAttribute('lang', 'ar');
  await expect(page.getByRole('group', { name: 'Script', exact: true })).toHaveCount(0);
  await page.getByText('Tanzil text notice', { exact: true }).click();
  await expect(page.getByText(/CHANGING IT IS NOT ALLOWED/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(a11y.violations.map((v) => v.id)).toEqual([]);
  await page.screenshot({ path: 'output/qa-quran-mobile.png', fullPage: true });
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/search?q=Dhp+5');
  await expect(page.getByRole('article', { name: 'Dhp 5', exact: true })).toBeVisible();
});
test('home, chapter picker, exact/fuzzy search, quotation check, report flow', async ({ page }) => {
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'A little curiosity. A clear source.' }),
  ).toBeVisible();
  await expect(page.locator('.explore-page')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();
  await page.screenshot({ path: 'output/qa-home-desktop.png', fullPage: true });
  await page
    .getByRole('navigation', { name: 'Main navigation', exact: true })
    .getByRole('link', { name: 'Read', exact: true })
    .click();
  await page.getByRole('link', { name: 'Begin reading Bhagavad Gita', exact: true }).click();
  await expect(page.getByLabel('Chapter', { exact: true })).toBeVisible();
  await page.getByLabel('Chapter', { exact: true }).selectOption('12');
  await expect(page.getByLabel('Verse', { exact: true }).locator('option')).toHaveCount(21);
  await page.getByLabel('Verse', { exact: true }).selectOption('20');
  await page.getByRole('button', { name: 'Open passage' }).click();
  await expect(page.getByRole('article', { name: 'BG 12.20' })).toBeVisible();
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/search?q=karmanye+vadhikaraste');
  await expect(page.getByRole('article', { name: 'BG 2.47' })).toBeVisible();
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/verify');
  await page
    .getByLabel('Paste what you heard')
    .fill(
      'Thy business is with the action only, never with its fruits; so let not the fruit of action be thy motive, nor be thou to inaction attached.',
    );
  await page.getByRole('button', { name: 'Check the quotation' }).click();
  const health = await (await page.request.get('/v1/health')).json();
  if (health.capabilities.ai_explanations) {
    await expect(page.getByText('Wording found', { exact: true })).toBeVisible();
    const article = page.getByRole('article', { name: 'BG 2.47' });
    await expect(article).toBeVisible();
    expect(await article.evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(
      await page
        .getByRole('heading', { name: 'What this result tells you' })
        .evaluate((el) => el.getBoundingClientRect().top),
    );
  } else {
    await expect(page.locator('.error[role="alert"]')).toContainText(
      'No AI assessment was produced',
    );
    await expect(page.locator('.verify-result')).toHaveCount(0);
    await page.goto('/read/bhagavad-gita/BG-2.47');
  }
  const article = page.getByRole('article', { name: 'BG 2.47' });
  await article.getByRole('link', { name: 'Report an error' }).click();
  await page
    .getByLabel('Describe the issue')
    .fill(
      'Automated browser regression test: attribution and chapter count check. No correction requested.',
    );
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.getByText('Your report was received.')).toBeVisible();
});
test('mobile layout, primary text labels, keyboard access and no external scripts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await expect(
    page.getByRole('region', { name: 'Primary text · BG 2.47', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Human translation · BG 2.47', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  expect(
    await page
      .locator('script[src]')
      .evaluateAll((nodes) =>
        nodes
          .map((n) => new URL((n as HTMLScriptElement).src).origin)
          .filter((o) => o !== location.origin),
      ),
  ).toEqual([]);
  await page.screenshot({ path: 'output/qa-reader-mobile.png', fullPage: true });
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeAttached();
  await page.waitForFunction(() => document.body.dataset.accountSync === 'ready');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});
