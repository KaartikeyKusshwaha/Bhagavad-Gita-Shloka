import { test, expect } from './reader-fixture';
import AxeBuilder from '@axe-core/playwright';

test('compares attributed human editions and discloses combined source ranges on mobile', async ({
  page,
}) => {
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/read/bhagavad-gita/BG-2.43');
  const comparison = page.locator('.translation-comparison');
  await expect(comparison.locator('.comparison-grid')).toBeHidden();
  await page.getByText('Compare human translations', { exact: true }).click();
  await expect(comparison.getByRole('heading', { name: 'Annie Besant (1922)' })).toBeVisible();
  await expect(
    comparison.getByRole('heading', { name: 'Swami Swarupananda (1909)' }),
  ).toBeVisible();
  await expect(
    comparison.getByText('Swarupananda 2.42–44 (combined verses)', { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel('Translation', { exact: true })
    .selectOption({ label: 'Swami Swarupananda (1909)' });
  await expect(
    page.getByRole('region', { name: 'Human translation · BG 2.43', exact: true }),
  ).toContainText('set determination');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.screenshot({ path: 'output/qa-comparison-mobile.png', fullPage: true });
});
