import { test, expect } from '@playwright/test';

test('a downloaded edition stays readable and exactly searchable with the network disabled', async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.goto('/library');
  const gita = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Bhagavad Gita', exact: true }) });
  await gita.getByRole('button', { name: 'Save for offline', exact: true }).click();
  await expect(gita.getByText(/Saved for offline reading and exact search/)).toBeVisible({
    timeout: 90000,
  });
  await page.goto('/offline');
  await expect(page.locator('.offline-reader')).toHaveAttribute('data-ready', 'true');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel('Saved text', { exact: true })).toHaveValue('bhagavad-gita');
  await page.getByLabel('Search saved text or reference', { exact: true }).fill('BG 2.47');
  await page.getByRole('button', { name: 'Search offline', exact: true }).click();
  await expect(page.getByRole('article', { name: 'BG 2.47', exact: true })).toBeVisible();
  await page.getByLabel('Search saved text or reference', { exact: true }).fill('action only');
  await page.getByRole('button', { name: 'Search offline', exact: true }).click();
  await expect(page.getByRole('article', { name: 'BG 2.47', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/qa-offline-desktop.png', fullPage: true });
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await expect(page).toHaveURL(/\/offline$/);
  await expect(page.getByLabel('Saved text', { exact: true })).toHaveValue('bhagavad-gita');
  await context.setOffline(false);
});

test('human recitation is labelled with its whole-surah scope and loads only on request', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('upload.wikimedia.org')) requests.push(request.url());
  });
  await page.goto('/read/quran/Quran-1:1');
  expect(requests).toEqual([]);
  await expect(page.locator('audio')).toHaveCount(0);
  await page.getByText('Listen · human recitation', { exact: true }).click();
  await expect(
    page.getByText('Complete Surah 1, Al-Fatiha (all seven verses)', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('audio')).toHaveAttribute('preload', 'none');
  await expect(page.locator('audio')).toHaveAttribute(
    'src',
    'https://upload.wikimedia.org/wikipedia/commons/e/ea/Surah-Fathia.flac',
  );
  expect(requests).toEqual([]);
  await expect(page.getByRole('link', { name: 'Source recording ↗', exact: true })).toBeVisible();
});
