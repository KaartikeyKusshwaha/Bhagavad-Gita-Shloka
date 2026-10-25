import { test, expect } from './reader-fixture';
import AxeBuilder from '@axe-core/playwright';

test('practice hides the source, compares a recall and persists a spaced review', async ({
  page,
}) => {
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await page.getByText('Practice this passage', { exact: true }).click();
  await page.getByRole('button', { name: 'Hide practice text', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Primary text · BG 2.47', exact: true }),
  ).toBeHidden();
  await page.getByLabel('Your recall', { exact: true }).fill('a synthetic recall attempt');
  await page.getByRole('button', { name: 'Compare wording', exact: true }).click();
  await expect(page.getByText('Review these text differences.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Primary text · BG 2.47', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Remembered', exact: true }).click();
  await page.goto('/study');
  await page.getByRole('button', { name: 'Study tools', exact: true }).click();
  await page.getByLabel('Choose a study tool').selectOption('revision');
  await expect(page.getByRole('link', { name: /Bhagavad Gita · BG 2.47/ })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Study tools', exact: true }).click();
  await page.getByLabel('Choose a study tool').selectOption('revision');
  await expect(page.getByRole('link', { name: /Bhagavad Gita · BG 2.47/ })).toBeVisible();
});

test('daily reading resumes with real passage progress and classroom links reconstruct the set', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/study');
  await page.getByRole('button', { name: 'Study tools', exact: true }).click();
  await page.getByLabel('Reading plan text').selectOption('dhammapada');
  await page.getByLabel('Daily pace').selectOption('1');
  await page.getByRole('button', { name: 'Start reading plan', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Dhp 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bookmark to my account', exact: true }).click();
  await page.getByRole('button', { name: 'Complete today’s reading', exact: true }).click();
  await expect(
    page.getByText('Dhammapada · 1 of 423 passages complete', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Study tools', exact: true }).click();
  await expect(page.getByText(/Today’s reading is complete/)).toBeVisible();
  await page.getByLabel('Choose a study tool').selectOption('lesson');
  await page.getByLabel('Classroom set title').fill('Classroom test set');
  await page.getByLabel('Dhammapada · Dhp 1', { exact: true }).check();
  await page.getByRole('button', { name: 'Create share link', exact: true }).click();
  const share = await page.getByLabel('Classroom share link').inputValue();
  expect(share).toContain('/lesson#');
  await page.goto(share);
  await expect(
    page.getByRole('heading', { name: 'Classroom test set', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('article', { name: 'Dhp 1', exact: true })).toBeVisible();
  await expect(
    page.getByText('What does the surrounding passage add?', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  await page.screenshot({ path: 'output/qa-classroom-mobile.png', fullPage: true });
});
