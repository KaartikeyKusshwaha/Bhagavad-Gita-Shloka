import { afterEach, expect, it, vi } from 'vitest';
import { permittedResearchUrl, researchPublicSources } from './research.ts';
afterEach(() => vi.unstubAllGlobals());
it('only follows reviewed HTTPS publisher hosts, excluding credentials, IPs and lookalikes', () => {
  for (const url of [
    'http://talkorigins.org/a',
    'https://127.0.0.1/a',
    'https://169.254.169.254/a',
    'https://talkorigins.org.evil.test/a',
    'https://secret@talkorigins.org/a',
    'https://talkorigins.org:8443/a',
    'file:///etc/passwd',
  ])
    expect(permittedResearchUrl(url)).toBe(false);
  expect(permittedResearchUrl('https://talkorigins.org/faqs/test')).toBe(true);
});
it('retrieves actual article evidence and cited reports, retaining provenance rather than search snippets', async () => {
  const fetcher = vi.fn(async (url: string | URL) => {
    const parsed = new URL(url);
    if (parsed.searchParams.get('list') === 'search')
      return new Response(
        JSON.stringify({ query: { search: [{ pageid: 987654321, title: 'Synthetic event' }] } }),
        { headers: { 'content-type': 'application/json' } },
      );
    if (parsed.searchParams.get('action') === 'parse')
      return new Response(
        JSON.stringify({
          parse: {
            revid: 987654322,
            text: '<p>The synthetic event was recorded in a contemporary public report.<sup class="reference"><a href="#cite_note-1">[1]</a></sup></p><ol class="references"><li id="cite_note-1"><a class="external" href="https://talkorigins.org/synthetic-report">Report</a></li></ol>',
          },
        }),
        { headers: { 'content-type': 'application/json' } },
      );
    return new Response(
      '<title>Synthetic contemporary report</title><p>The synthetic event was recorded here in a contemporary report, with a qualification.</p>',
      { headers: { 'content-type': 'text/html' } },
    );
  });
  vi.stubGlobal('fetch', fetcher);
  const result = await researchPublicSources(['synthetic event']);
  expect(result.sources).toHaveLength(2);
  expect(result.sources[0].url).toContain('oldid=987654322');
  expect(result.sources[1].kind).toBe('referenced_report');
  expect(result.sources[1].text).toContain('qualification');
});
it('reports search failure explicitly without manufacturing an insufficient-evidence assessment', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('unavailable', { status: 503 })),
  );
  await expect(researchPublicSources(['new public event'])).rejects.toMatchObject({
    code: 'RESEARCH_UNAVAILABLE',
  });
});
