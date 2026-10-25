import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.afterEach(async ({ page }) => {
  const response = await page.request.get('/v1/account');
  if (!response.ok()) return;
  const { user } = await response.json();
  if (
    user &&
    (/^qa_\d+$/.test(user.username) || /^qa_email_\d+@example\.com$/.test(user.email ?? ''))
  )
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
  await page.goto('/account');
  await page.locator('main').getByRole('link', { name: 'Sign up', exact: true }).click();
  await page.getByRole('button', { name: 'Use a username instead', exact: true }).click();
  await page.getByLabel('Your name', { exact: true }).fill('Reading tester');
  await page.getByLabel(/^Username/).fill(username);
  await page.getByLabel(/^Website password/).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep your recovery code safe' })).toBeVisible();
  await expect(page.locator('.recovery-code')).toHaveText(/^[a-f0-9]{48}$/);
  await page.getByRole('button', { name: 'I saved my code · Continue' }).click();
  await expect(
    page.getByText('Welcome, Reading tester. Your dashboard syncs across devices.'),
  ).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your profile details' })).toContainText(
    'Reading tester',
  );
  await page.getByText('Profile', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Account profile' })).toContainText(username);
  await page.getByRole('link', { name: 'Profile & account details' }).click();
  await expect(page.getByRole('region', { name: 'Your profile details' })).toContainText(username);
  await page.getByRole('link', { name: 'Open my dashboard', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saved passages 0' })).toBeVisible();
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
    await second.getByLabel('Email or username', { exact: true }).fill(username);
    await second.getByRole('button', { name: 'Continue with email or username' }).click();
    await second.getByLabel(/^Website password/).fill(password);
    await second.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(
      second
        .locator('.activity-summary span')
        .filter({ hasText: 'passage marked read' })
        .locator('strong'),
    ).toHaveText('1');
    await second.getByRole('button', { name: 'Saved passages 1' }).click();
    await expect(second.getByRole('link', { name: /Bhagavad Gita · BG 2.47/ })).toBeVisible();
    await second.getByRole('button', { name: 'Study tools', exact: true }).click();
    await expect(second.getByRole('progressbar', { name: 'Reading plan progress' })).toBeVisible();
    await second.goto('/');
    await second.getByRole('button', { name: 'Open Explore history' }).click();
    await expect(second.getByRole('button', { name: 'BG 2.47 1 exchange' })).toBeVisible();
    await second.goto('/account');
    await second.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(second.getByRole('dialog')).toBeVisible();
    await page.goto('/account');
    await page.getByText('Delete my account', { exact: true }).click();
    await page.getByLabel('Confirm your password').fill(password);
    await page.getByRole('button', { name: 'Permanently delete account' }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
    await page.goto('/account');
    await expect(page.locator('.account-loading')).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'output/qa-account-mobile.png', fullPage: true });
  } finally {
    await context.close();
  }
});

test('email-first access opens signup for a new address and signs existing readers in without losing their account', async ({
  page,
}) => {
  test.setTimeout(90000);
  const email = `qa_email_${Date.now()}@example.com`,
    password = 'only-testing-a-long-password';
  await page.goto('/account/signin');
  await page.getByLabel('Email or username', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Continue with email or username' }).click();
  await expect(page).toHaveURL(/\/account\/signup$/);
  await expect(page.getByRole('heading', { name: 'Create your account.' })).toBeVisible();
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(email);
  await page.getByLabel('Your name', { exact: true }).fill('Email reader');
  await page.getByLabel(/^Website password/).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep your recovery code safe' })).toBeVisible();
  await page.getByRole('button', { name: 'I saved my code · Continue' }).click();
  await expect(
    page.getByText('Welcome, Email reader. Your dashboard syncs across devices.'),
  ).toBeVisible();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/account\/required$/, { timeout: 20000 });
  await page.goto('/account/signin');
  await page.getByLabel('Email or username', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Continue with email or username' }).click();
  await expect(page.getByLabel(/^Website password/)).toBeVisible();
  await page.getByLabel(/^Website password/).fill('wrong-long-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('password is incorrect');
  await expect(page).toHaveURL(/\/account\/signin$/);
  await page.getByLabel(/^Website password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByText('Welcome, Email reader. Your dashboard syncs across devices.'),
  ).toBeVisible();
  const removed = await page.request.delete('/v1/account', {
    headers: { 'x-scripture-client': '1' },
    data: { password },
  });
  expect(removed.status()).toBe(200);
  await page.goto('/account/signup');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/qa-email-signup-mobile.png', fullPage: true });
});

test('guests cannot open Explore, Read or Study and the signup popup is accessible in maroon appearance', async ({
  page,
  request,
}) => {
  for (const target of [
    '/',
    '/library',
    '/read/bhagavad-gita/BG-2.47',
    '/study',
    '/search?q=BG%202.47',
  ]) {
    await page.goto(target);
    await expect(page).toHaveURL(/\/account\/required$/);
    const popup = page.getByRole('dialog', { name: 'Make this space yours.' });
    await expect(popup).toBeVisible();
    await expect(
      page.locator('.explore-page,.passage-card,.study-page,.library-browser'),
    ).toHaveCount(0);
  }
  for (const endpoint of [
    '/v1/search?q=BG%202.47',
    '/v1/works',
    '/v1/passages/bhagavad-gita/BG%202.47',
  ])
    expect((await request.get(endpoint)).status()).toBe(401);
  const popup = page.getByRole('dialog');
  await popup.getByRole('link', { name: 'Sign up', exact: true }).click();
  await expect(page.getByLabel('Email address', { exact: true })).toBeVisible();
  await page.goto('/study');
  await page.getByRole('dialog').getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByLabel('Email or username', { exact: true })).toBeVisible();
  await page.goto('/study');
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--paper').trim(),
    ),
  ).toBe('#190d13');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/qa-maroon-member-popup.png', fullPage: true });
});
