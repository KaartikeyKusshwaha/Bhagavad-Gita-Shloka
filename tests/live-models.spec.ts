import { test, expect } from './e2e/reader-fixture';
import AxeBuilder from '@axe-core/playwright';

test('real model retrieval, cited follow-up and persisted Explore answer', async ({
  page,
  request,
}) => {
  test.setTimeout(180000);
  const health = await (await request.get('/v1/health')).json();
  expect(health.capabilities.semantic).toBe(true);
  expect(health.capabilities.ai_explanations).toBe(true);
  const semanticResponse = await request.get('/v1/search', {
    params: { q: 'What causes anger to grow from desire?', mode: 'semantic', limit: 5 },
    timeout: 45000,
  });
  expect(semanticResponse.ok(), await semanticResponse.text()).toBe(true);
  const semantic = await semanticResponse.json();
  expect(semantic.hits.map((h: { passage: { ref: string } }) => h.passage.ref)).toContain(
    'BG 2.62',
  );
  expect(semantic.hits.every((h: { match_type: string }) => h.match_type === 'semantic')).toBe(
    true,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page.getByLabel('Search collection', { exact: true }).selectOption('bhagavad-gita');
  await page
    .getByRole('textbox', { name: 'Ask the collection', exact: true })
    .fill('What does BG 2.47 say about the results of action?');
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  await expect(
    page.getByText('AI study explanation · check the sources', { exact: true }),
  ).toBeVisible({ timeout: 90000 });
  await expect(page.locator('.answer-citations a').first()).toHaveAttribute(
    'href',
    /\/read\/bhagavad-gita\//,
  );
  await expect(page).toHaveURL(/\?chat=/);
  await page.reload();
  await expect(
    page.getByText('AI study explanation · check the sources', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Ask the collection', exact: true })
    .fill('How does that differ from avoiding work?');
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  await expect(
    page.getByText('AI study explanation · check the sources', { exact: true }),
  ).toHaveCount(2, { timeout: 90000 });
  const second = page.locator('.conversation-turn').nth(1);
  await expect(second.locator('.answer-citations a').first()).toHaveAttribute(
    'href',
    /\/read\/bhagavad-gita\//,
  );
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.screenshot({ path: 'output/qa-real-cited-ask.png', fullPage: true });
  const blocked = await (
    await request.post('/v1/ask', { data: { question: 'Explain Dhp 5' } })
  ).json();
  expect(blocked.answer).toBeNull();
  expect(blocked.note).toContain('exclude this AI use');
});

test('Verify explains that a modern broadcast claim is not established by retrieved scripture', async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Quotation to verify', exact: true })
    .fill(
      'In 1993, a man named George Jammal convinced CBS television to air a primetime special titled "The Incredible Discovery of Noah’s Ark". He claimed he had climbed a mountain in Turkey and found the physical remains of Noah’s Ark.',
    );
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  await expect(page.getByText('Not established from these texts', { exact: true })).toBeVisible({
    timeout: 110000,
  });
  await expect(page.getByText('AI assessment · evidence limit', { exact: true })).toBeVisible();
  await expect(page.locator('.response-explanation').first()).toContainText(
    /evidence|passages|sources/i,
  );
  await expect(page.locator('.answer-citations a')).toHaveCount(0);
  await expect(page.locator('.explore-error')).toHaveCount(0);
  await page.waitForFunction(() => document.body.dataset.accountSync === 'ready');
  await page.reload();
  await expect(page.getByText('Not established from these texts', { exact: true })).toBeVisible();
});
