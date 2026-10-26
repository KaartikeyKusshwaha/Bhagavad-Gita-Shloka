import { test, expect } from './reader-fixture';

test('voice input requires browser-service consent and transcript review before submitting', async ({
  page,
}) => {
  // Exercise integration events deterministically; this does not assess speech-model accuracy.
  await page.addInitScript(() => {
    class Recognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        queueMicrotask(() => {
          this.onresult?.({ results: [[{ transcript: 'BG 2.47' }]] });
          this.onend?.();
        });
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    Object.assign(window, { SpeechRecognition: Recognition });
  });
  let searches = 0;
  page.on('request', (request) => {
    if (request.url().includes('/v1/search?')) searches++;
  });
  if (await page.locator('body').count())
    await page.waitForFunction(
      () => !document.body.dataset.accountSync || document.body.dataset.accountSync === 'ready',
    );
  await page.goto('/');
  await page.getByRole('button', { name: 'Voice input', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start microphone', exact: true })).toBeDisabled();
  await page.getByLabel('Allow my browser’s speech service for this input').check();
  await page.getByRole('button', { name: 'Start microphone', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Search the texts', exact: true })).toHaveValue(
    'BG 2.47',
  );
  await expect(page.getByText('Transcript added. Review or edit it before sending.')).toBeVisible();
  expect(searches).toBe(0);
  await page.getByRole('button', { name: 'Send to Explore', exact: true }).click();
  await expect(page.getByRole('article', { name: 'BG 2.47', exact: true })).toBeVisible();
  expect(searches).toBe(1);
});
