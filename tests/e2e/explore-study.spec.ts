import { test, expect } from './reader-fixture';
import AxeBuilder from '@axe-core/playwright';
test('Explore saves, reopens, renames and deletes history; pause keeps a conversation temporary', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Main navigation', exact: true }).getByRole('link'),
  ).toHaveCount(3);
  await page.getByRole('textbox', { name: 'Search the texts', exact: true }).fill('BG 2.47');
  await page.getByRole('button', { name: 'Send to Explore' }).click();
  await expect(page.getByRole('article', { name: 'BG 2.47' })).toBeVisible();
  await expect(page).toHaveURL(/\?chat=/);
  await page.reload();
  await expect(page.getByRole('article', { name: 'BG 2.47' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Explore history' }).click();
  const history = page.getByRole('dialog', { name: 'Pick up a thought.' });
  await expect(history.getByRole('button', { name: 'BG 2.47 1 exchange' })).toBeVisible();
  await history.getByLabel('Options for BG 2.47', { exact: true }).click();
  await history.getByRole('button', { name: 'Rename', exact: true }).click();
  await history.getByRole('textbox', { name: 'Conversation name' }).fill('My action study');
  await history.getByRole('button', { name: 'Save conversation name' }).click();
  await expect(history.getByRole('button', { name: 'My action study 1 exchange' })).toBeVisible();
  await history.getByRole('button', { name: 'Pause saving history' }).click();
  await history.getByRole('button', { name: 'New exploration', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search the texts', exact: true }).fill('BG 4.7');
  await page.getByRole('button', { name: 'Send to Explore' }).click();
  await expect(page.getByRole('article', { name: 'BG 4.7' })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'A little curiosity. A clear source.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Open Explore history' }).click();
  await expect(history.getByRole('button', { name: 'My action study 1 exchange' })).toBeVisible();
  await expect(history.getByRole('button', { name: 'BG 4.7 1 exchange' })).toHaveCount(0);
  await history.getByRole('button', { name: 'My action study 1 exchange' }).click();
  await expect(page.getByRole('article', { name: 'BG 2.47' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Explore history' }).click();
  await history.getByLabel('Options for My action study').click();
  await history.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Open Explore history' }).click();
  await expect(
    history.getByText('Your saved searches and questions will appear here.'),
  ).toBeVisible();
});
test('Study counts only deliberate reading and real submissions; bookmarks and activity survive reload', async ({
  page,
}) => {
  await page.goto('/study');
  await expect(page.getByText('Your first day starts with a passage or a question.')).toBeVisible();
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await page.reload();
  await page.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Read · saved to Study' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Read · saved to Study' }).click();
  await page.getByRole('button', { name: 'Bookmark to my account', exact: true }).click();
  await page.goto('/study');
  await expect(page.getByText('1 passage marked read', { exact: true })).toBeVisible();
  const active = page.getByRole('grid').getByRole('button', { name: /: 1 learning action$/ });
  await expect(active).toHaveCount(1);
  await page.screenshot({ path: 'output/qa-study-desktop.png', fullPage: true });
  await active.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('No recorded activity. There is no need to catch up.')).toBeVisible();
  await page.getByRole('button', { name: 'Saved passages 1' }).click();
  await expect(page.getByRole('link', { name: /Bhagavad Gita · BG 2.47/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Saved passages 1' }).click();
  await expect(page.getByRole('link', { name: /Bhagavad Gita · BG 2.47/ })).toBeVisible();
  await page.getByRole('button', { name: 'Remove BG 2.47 from bookmarks' }).click();
  await expect(page.getByRole('heading', { name: 'Keep a passage close.' })).toBeVisible();
});
test('Explore and Study work on mobile, with accessible controls and an overlay that restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await expect(page.locator('.explore-page')).toHaveAttribute('data-ready', 'true');
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'output/qa-explore-mobile.png', fullPage: true });
  const exploreA11y = await new AxeBuilder({ page }).analyze();
  expect(
    exploreA11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Open Explore history' }).click();
  await expect(page.getByRole('button', { name: 'Close history' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByText('Manage device history', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close history' })).toBeFocused();
  await page.getByText('Manage device history', { exact: true }).click();
  await page.getByRole('button', { name: 'Close history' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Clear all Explore history' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close history' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open Explore history' })).toBeFocused();
  await page.goto('/study');
  await expect(page.getByRole('grid')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.screenshot({ path: 'output/qa-study-mobile.png', fullPage: true });
  const studyA11y = await new AxeBuilder({ page }).analyze();
  expect(
    studyA11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
  ).toEqual([]);
});
