import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.afterEach(async ({ page }) => {
  await page.request.delete('/v1/account', {
    headers: { 'x-scripture-client': '1' },
    data: { password: 'only-testing-a-long-password' },
  });
});
test('accounts carry reading, bookmarks, lessons and history to a new browser; signout isolates guest data', async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  const username = `qa_${Date.now()}`,
    password = 'only-testing-a-long-password';
  await page.goto('/read/bhagavad-gita/BG-4.7');
  await page.getByRole('button', { name: 'Bookmark on this device', exact: true }).click();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Reading tester');
  await page.getByLabel(/^Username/).fill(username);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep your recovery code safe' })).toBeVisible();
  await expect(page.locator('.recovery-code')).toHaveText(/^[a-f0-9]{48}$/);
  await page.getByRole('button', { name: 'I saved my code · Continue' }).click();
  await expect(
    page.getByText('Welcome, Reading tester. Your dashboard syncs across devices.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saved passages 0' })).toBeVisible();
  await page.getByText('Bring your guest reading with you', { exact: true }).click();
  await page.getByRole('button', { name: 'Import browser data', exact: true }).click();
  await expect(
    page.getByText('Browser data imported. Your existing account entries take priority.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Saved passages 1' })).toBeVisible();
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await page.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await page.getByRole('button', { name: 'Bookmark to my account', exact: true }).click();
  await page.getByRole('link', { name: 'Study', exact: true }).first().click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved to your account' })).toBeVisible();
  await page.getByRole('button', { name: 'Study tools', exact: true }).click();
  await page.getByRole('combobox', { name: 'Reading plan text' }).selectOption('bhagavad-gita');
  await page.getByRole('button', { name: 'Start reading plan' }).click();
  await expect(page.getByRole('progressbar', { name: 'Reading plan progress' })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Saved to your account' })).toBeVisible();
  await page.goto('/');
  await expect(page.locator('.explore-page')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('textbox', { name: 'Search the texts', exact: true }).fill('BG 2.47');
  await page.getByRole('button', { name: 'Send to Explore' }).click();
  await expect(page.getByRole('article', { name: 'BG 2.47' })).toBeVisible({ timeout: 20000 });
  await page.getByRole('link', { name: 'Study', exact: true }).first().click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved to your account' })).toBeVisible();
  const context = await browser.newContext({
      baseURL: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3100',
    }),
    second = await context.newPage();
  try {
    await second.goto('/account');
    await expect(second.locator('.account-loading')).toHaveCount(0);
    await second.getByLabel(/^Username/).fill(username);
    await second.getByLabel(/^Password/).fill(password);
    await second.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      second
        .locator('.activity-summary span')
        .filter({ hasText: 'passage marked read' })
        .locator('strong'),
    ).toHaveText('1');
    await second.getByRole('button', { name: 'Saved passages 2' }).click();
    await expect(second.getByRole('link', { name: /Bhagavad Gita · BG 2.47/ })).toBeVisible();
    await second.getByRole('button', { name: 'Study tools', exact: true }).click();
    await expect(second.getByRole('progressbar', { name: 'Reading plan progress' })).toBeVisible();
    await second.goto('/');
    await second.getByRole('button', { name: 'Open Explore history' }).click();
    await expect(second.getByRole('button', { name: 'BG 2.47 1 exchange' })).toBeVisible();
    await second.goto('/account');
    await second.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(second.getByRole('button', { name: 'Saved passages 0' })).toBeVisible();
    await page.goto('/account');
    await page.getByText('Delete my account', { exact: true }).click();
    await page.getByLabel('Confirm your password').fill(password);
    await page.getByRole('button', { name: 'Permanently delete account' }).click();
    await expect(page.getByRole('button', { name: 'Saved passages 1' })).toBeVisible();
    await page.goto('/account');
    await expect(page.locator('.account-loading')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'output/qa-account-mobile.png', fullPage: true });
  } finally {
    await page.request.delete('/v1/account', {
      headers: { 'x-scripture-client': '1' },
      data: { password },
    });
    await context.close();
  }
});
