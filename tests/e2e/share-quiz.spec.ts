import { test, expect } from '@playwright/test';
import { recallQuiz } from '../../packages/shared/src/practice';
test('downloads a real attributed PNG and quizzes recorded word order', async ({
  page,
  request,
}) => {
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await page.getByLabel('Share passage', { exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download passage card', exact: true }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe('BG-2.47-attributed.png');
  await saved.saveAs('output/qa-attributed-passage.png');
  expect(await saved.failure()).toBeNull();
  await page.getByText('Practice this passage', { exact: true }).click();
  await page.getByRole('button', { name: 'Try a word-order quiz', exact: true }).click();
  const p = (await (await request.get('/v1/passages/bhagavad-gita/BG-2.47')).json()).passage;
  const quiz = recallQuiz(p.original_text)!;
  await page
    .getByRole('group', { name: 'Quiz choices', exact: true })
    .getByRole('button', { name: quiz.answer, exact: true })
    .click();
  await expect(page.getByText(/Correct\. Reveal the passage/)).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Primary text · BG 2.47', exact: true }),
  ).toBeHidden();
});
