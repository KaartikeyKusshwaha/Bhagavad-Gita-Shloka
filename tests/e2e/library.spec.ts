import { test, expect } from './reader-fixture';
import AxeBuilder from '@axe-core/playwright';
test('tradition shelves contain real texts, languages and durable private reading tools', async ({
  page,
}) => {
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/library');
  await expect(
    page.getByRole('heading', { name: 'Many traditions. Room for discovery.' }),
  ).toBeVisible();
  const tabs = page.getByRole('navigation', { name: 'Reading traditions' });
  await expect(tabs.getByRole('button')).toHaveCount(14);
  await tabs.getByRole('button', { name: /^Hinduism/ }).click();
  await expect(page.getByRole('heading', { name: 'Valmiki Ramayana', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Rigveda', exact: true })).toBeVisible();
  await tabs.getByRole('button', { name: /^Jainism/ }).click();
  await expect(page.getByRole('heading', { name: 'Kalpa Sutra', exact: true })).toBeVisible();
  await tabs.getByRole('button', { name: /^Judaism/ }).click();
  await page.getByLabel('Find a text').fill('Genesis');
  await page.getByRole('link', { name: 'Begin reading Genesis', exact: true }).click();
  await expect(
    page.getByRole('article', { name: 'Tanakh Genesis 1.1', exact: true }),
  ).toBeVisible();
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/read/bible-genesis/Genesis-1.1');
  await expect(page.getByText('Human edition · English', { exact: true })).toBeVisible();
  await expect(page.getByText('Human translation · Hindi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bookmark to my account', exact: true }).click();
  await page.getByText('Bookmark colour & private note', { exact: true }).click();
  await page.getByRole('button', { name: 'sage bookmark', exact: true }).click();
  await page.getByLabel('My note', { exact: true }).fill('My private Genesis note');
  await page.getByRole('button', { name: 'Mark as read', exact: true }).click();
  await page.waitForFunction(() => document.body.dataset.accountSync === 'ready');
  await page.reload();
  await expect(page.locator('.passage-card')).toHaveClass(/marked-sage/);
  await page.getByText('Bookmark colour & private note', { exact: true }).click();
  await expect(page.getByLabel('My note', { exact: true })).toHaveValue('My private Genesis note');
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/library');
  await expect(page.getByRole('link', { name: /CONTINUE READING Genesis/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations.map((v) => v.id)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'output/qa-expanded-library-mobile.png', fullPage: false });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/qa-expanded-library-desktop.png', fullPage: false });
});
test('large chapters paginate and restricted editions have no machine-translation action', async ({
  page,
  request,
}) => {
  const r = await request.get('/v1/works/quran/chapters/2?page=2');
  expect(r.status()).toBe(200);
  expect((await r.json()).passages[0].ref).toBe('Quran 2:81');
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/read/quran/chapter/2?page=4');
  await expect(page.getByRole('navigation', { name: 'Section pages' })).toContainText(
    'Page 4 of 4',
  );
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/read/quran/Quran-1:1');
  await expect(page.getByText('Human translation · English', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Read a study translation in another language', { exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await request.post('/v1/study-translation', {
        data: { passage_id: 'quran.1.1', target_lang: 'hi' },
      })
    ).status(),
  ).toBe(403);
});
test('saved conversation context is opt-in and never contains private bookmark notes', async ({
  page,
  request,
}) => {
  const p = (await (await request.get('/v1/passages/bible-genesis/Genesis-1.1')).json()).passage;
  const sent: { history?: { question: string; answer?: string }[] }[] = [];
  await page.route('**/v1/ask', async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      json: {
        passages: [{ passage: p, score: 1, match_type: 'reference' }],
        answer: {
          paragraphs: [{ text: 'Synthetic browser context fixture.', citations: [p.id] }],
          model: 'test-fixture',
        },
      },
    });
  });
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/read/bible-genesis/Genesis-1.1');
  await page.getByRole('button', { name: 'Bookmark to my account', exact: true }).click();
  await page.getByText('Bookmark colour & private note', { exact: true }).click();
  await page
    .getByLabel('My note', { exact: true })
    .fill('Private note must not leave this browser');
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Ask the collection', exact: true })
    .fill('What does Genesis 1:1 say about creation?');
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  await expect(page.locator('.response-explanation')).toContainText(
    'Synthetic browser context fixture.',
  );
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await page.getByLabel('Use relevant saved conversations', { exact: false }).check();
  await page
    .getByRole('textbox', { name: 'Ask the collection', exact: true })
    .fill('Explain Genesis creation again');
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  await expect.poll(() => sent.length).toBe(2);
  expect(sent[0].history).toEqual([]);
  expect(sent[1].history?.[0].question).toContain('Genesis 1:1');
  expect(sent[1].history?.[0].answer).toContain('Synthetic browser context fixture.');
  expect(JSON.stringify(sent)).not.toContain('Private note must not leave this browser');
});
