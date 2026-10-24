import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('graph filters suggestions, previews a source neighbour and follows its connections', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await page.getByText('Explore related passages', { exact: true }).click();
  const graph = page.getByRole('group', {
    name: 'Interactive passage graph from BG 2.47',
    exact: true,
  });
  await expect(graph).toBeVisible({ timeout: 15000 });
  await expect(graph.getByRole('button')).not.toHaveCount(0);
  await page.getByLabel('Connection type', { exact: true }).selectOption('source');
  await expect(graph.locator('.suggested-node')).toHaveCount(0);
  await graph.getByRole('button', { name: 'BG 2.46 Hinduism From source', exact: true }).click();
  await expect(
    page.locator('.connection-preview').getByRole('article', { name: 'BG 2.46', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Adjacent in this edition', { exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, html: n.html })),
    })),
  ).toEqual([]);
  await page.screenshot({ path: 'output/qa-graph-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Follow connections from BG 2.46', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Connections from BG 2.46', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.connection-list')).toBeVisible({ timeout: 15000 });
});

test('themes use the same Explore history and preserve distinct sources', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.getByText('Explore a theme across texts', { exact: true }).click();
  await page.getByRole('button', { name: 'Compassion & kindness', exact: true }).click();
  await expect(page.locator('.user-message > span')).toHaveText('Search');
  await expect(page.getByText(/an editorial keyword trail/)).toBeVisible();
  await page.locator('.more-evidence > summary').click();
  await expect(
    page
      .locator('.evidence-list')
      .getByText(/Quran · Quran/)
      .first(),
  ).toBeVisible();
  await expect(
    page
      .locator('.evidence-list')
      .getByText(/Bhagavad Gita · BG/)
      .first(),
  ).toBeVisible();
  await expect(page).toHaveURL(/\?chat=/);
  await page.reload();
  await expect(page.getByText(/an editorial keyword trail/)).toBeVisible();
});
