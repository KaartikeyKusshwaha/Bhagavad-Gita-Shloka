import { test, expect } from '@playwright/test';
test('home, chapter picker, exact/fuzzy search, quotation check, report flow', async ({ page }) => {
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
  await page.getByRole('link', { name: 'Begin reading' }).click();
  await expect(page.getByLabel('Chapter', { exact: true })).toBeVisible();
  await page.getByLabel('Chapter', { exact: true }).selectOption('12');
  await expect(page.getByLabel('Verse', { exact: true }).locator('option')).toHaveCount(21);
  await page.getByLabel('Verse', { exact: true }).selectOption('20');
  await page.getByRole('button', { name: 'Open passage' }).click();
  await expect(page.getByRole('article', { name: 'BG 12.20' })).toBeVisible();
  await page.goto('/search?q=karmanye+vadhikaraste');
  await expect(page.getByRole('article', { name: 'BG 2.47' })).toBeVisible();
  await page.goto('/verify');
  await page
    .getByLabel('Paste what you heard')
    .fill(
      'Thy business is with the action only, never with its fruits; so let not the fruit of action be thy motive, nor be thou to inaction attached.',
    );
  await page.getByRole('button', { name: 'Check the quotation' }).click();
  await expect(page.getByText('Wording found', { exact: true })).toBeVisible();
  const article = page.getByRole('article', { name: 'BG 2.47' });
  await expect(article).toBeVisible();
  expect(await article.evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(
    await page
      .getByRole('heading', { name: 'What this result tells you' })
      .evaluate((el) => el.getBoundingClientRect().top),
  );
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
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await expect(page.getByRole('region', { name: 'Primary text', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Human translation', exact: true })).toBeVisible();
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
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});
