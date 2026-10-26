import { test, expect } from './reader-fixture';
test('Next saves the previous passage and updates the real account Study grid', async ({
  page,
  request,
}) => {
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await page
    .getByRole('button', { name: 'Next: BG 2.48 · save reading progress', exact: true })
    .click();
  await expect(page).toHaveURL(/BG-2.48$/);
  const data = (await (await request.get('/v1/account/data')).json()).data.device;
  expect(data.readPassages).toContain('bg.2.47');
  expect(
    data.activity.filter(
      (a: { kind: string; resource: string }) => a.kind === 'read' && a.resource === 'bg.2.47',
    ),
  ).toHaveLength(1);
  await page.goto('/study');
  await expect(page.locator('.activity-summary')).toContainText('1passage marked read');
  await page.reload();
  await expect(page.locator('.activity-summary')).toContainText('1passage marked read');
});
test('Cartesia original-text player generates playable audio and reuses its persistent cache', async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  await page.goto('/read/bible-genesis/Genesis-1.1');
  await expect(
    page.getByRole('button', { name: 'Listen to translation', exact: true }),
  ).toHaveCount(0);
  await page.getByText('Listen to original · English', { exact: true }).click();
  const options = await (
    await request.get('/v1/speech/options?passage_id=bible-genesis.1.1')
  ).json();
  if (!options.available && process.env.REQUIRE_LIVE_TTS !== '1') {
    await expect(page.locator('.original-speech')).toContainText('not configured');
    return;
  }
  expect(options.available).toBe(true);
  expect(options.voices.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Generate original audio', exact: true }).click();
  const audio = page.getByLabel('Original English audio · Genesis 1.1', { exact: true });
  await expect(audio).toBeVisible({ timeout: 65000 });
  await expect
    .poll(() =>
      audio.evaluate((el) => ({
        duration: (el as HTMLAudioElement).duration,
        ready: (el as HTMLAudioElement).readyState,
      })),
    )
    .toMatchObject({ ready: expect.any(Number) });
  await expect
    .poll(() => audio.evaluate((el) => (el as HTMLAudioElement).duration))
    .toBeGreaterThan(0);
  await audio.evaluate((el) => (el as HTMLAudioElement).play());
  await expect
    .poll(() => audio.evaluate((el) => (el as HTMLAudioElement).currentTime))
    .toBeGreaterThan(0);
  await audio.evaluate((el) => (el as HTMLAudioElement).pause());
  await page.getByLabel('Original audio speed', { exact: true }).selectOption('0.75');
  expect(await audio.evaluate((el) => (el as HTMLAudioElement).playbackRate)).toBe(0.75);
  await page.getByRole('button', { name: 'Load saved audio', exact: true }).click();
  await expect(
    page.getByText('Saved audio · no new generation request', { exact: false }),
  ).toBeVisible({ timeout: 15000 });
  await page.reload();
  await page.getByText('Listen to original · English', { exact: true }).click();
  await page.getByRole('button', { name: 'Generate original audio', exact: true }).click();
  await expect(
    page.getByText('Saved audio · no new generation request', { exact: false }),
  ).toBeVisible({ timeout: 15000 });
});
test('Sanskrit uses YourVoic, returns decodable audio and replays cached bytes', async ({
  page,
  request,
}) => {
  test.setTimeout(150000);
  const options = await (await request.get('/v1/speech/options?passage_id=bg.2.47')).json();
  await page.goto('/read/bhagavad-gita/BG-2.47');
  await page.getByText('Listen to original · Sanskrit', { exact: true }).click();
  if (!options.available && process.env.REQUIRE_LIVE_TTS !== '1') {
    await expect(page.locator('.original-speech')).toContainText('not configured');
    return;
  }
  expect(options.provider).toBe('yourvoic');
  expect(options.model).toBe('aura-prime');
  await page.getByRole('button', { name: 'Generate original audio', exact: true }).click();
  const audio = page.getByLabel('Original Sanskrit audio · BG 2.47', { exact: true });
  await expect(audio).toBeVisible({ timeout: 105000 });
  await expect
    .poll(() => audio.evaluate((el) => (el as HTMLAudioElement).duration))
    .toBeGreaterThan(0);
  await audio.evaluate((el) => (el as HTMLAudioElement).play());
  await expect
    .poll(() => audio.evaluate((el) => (el as HTMLAudioElement).currentTime))
    .toBeGreaterThan(0);
  await audio.evaluate((el) => (el as HTMLAudioElement).pause());
  await page.getByRole('button', { name: 'Load saved audio', exact: true }).click();
  await expect(
    page.getByText('Saved audio · no new generation request', { exact: false }),
  ).toBeVisible({ timeout: 15000 });
});
