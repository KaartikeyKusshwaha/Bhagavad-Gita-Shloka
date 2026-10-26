import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import type { WebEvidence } from '../../shared/src/research.ts';
import { AiServiceError } from './errors.ts';

const agent = 'OpenScripture/1.0 (https://github.com/KaartikeyKusshwaha/Bhagavad-Gita-Shloka)';
// A bounded discovery service, not a claim of searching the whole internet. Only
// citations discovered in Wikipedia are followed, and only on reviewed public hosts.
const reportHosts = new Set([
  'scholar.lib.vt.edu',
  'talkorigins.org',
  'www.talkorigins.org',
  'www.physics.smu.edu',
  'apnews.com',
  'www.bbc.com',
  'www.bbc.co.uk',
  'www.reuters.com',
  'www.loc.gov',
  'www.si.edu',
  'www.nasa.gov',
  'science.nasa.gov',
  'www.archives.gov',
  'www.history.com',
  'www.britannica.com',
  'www.discord.org',
  'discord.org',
]);
export function permittedResearchUrl(raw: string, wiki = false) {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    )
      return false;
    return reportHosts.has(url.hostname) || (wiki && url.hostname === 'en.wikipedia.org');
  } catch {
    return false;
  }
}
const pages = new Map<string, { expires: number; body: string }>();
async function readPublic(
  url: string,
  wiki = false,
  cache = true,
  deadline = Date.now() + 10000,
): Promise<string> {
  if (!permittedResearchUrl(url, wiki)) throw new Error('RESEARCH_URL_REJECTED');
  const cached = cache ? pages.get(url) : undefined;
  if (cached && cached.expires > Date.now()) return cached.body;
  let current = url;
  for (let redirect = 0; redirect < 4; redirect++) {
    const response = await fetch(current, {
      headers: { 'User-Agent': agent, Accept: wiki ? 'application/json' : 'text/html' },
      redirect: 'manual',
      signal: AbortSignal.timeout(Math.max(1, Math.min(10000, deadline - Date.now()))),
    });
    if (response.status >= 300 && response.status < 400) {
      const next = new URL(response.headers.get('location') ?? '', current).href;
      if (!permittedResearchUrl(next, wiki)) throw new Error('RESEARCH_REDIRECT_REJECTED');
      current = next;
      continue;
    }
    if (!response.ok || !/json|html|text\/plain/i.test(response.headers.get('content-type') ?? ''))
      throw new Error('RESEARCH_SOURCE_UNAVAILABLE');
    if (Number(response.headers.get('content-length') ?? 0) > 2500000)
      throw new Error('RESEARCH_SOURCE_TOO_LARGE');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('RESEARCH_SOURCE_EMPTY');
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        length += next.value.byteLength;
        if (length > 2500000) {
          await reader.cancel();
          throw new Error('RESEARCH_SOURCE_TOO_LARGE');
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = Buffer.concat(chunks).toString('utf8');
    if (cache && body.length <= 750000) {
      if (pages.size >= 12) pages.delete(pages.keys().next().value!);
      pages.set(url, { body, expires: Date.now() + 15 * 60000 });
    }
    return body;
  }
  throw new Error('RESEARCH_REDIRECT_LIMIT');
}
function wikiUrl(params: Record<string, string>) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    format: 'json',
    formatversion: '2',
    maxlag: '5',
    ...params,
  }).toString();
  return url.href;
}
function terms(query: string) {
  return [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])].filter(
    (w) =>
      ![
        'the',
        'and',
        'that',
        'this',
        'was',
        'were',
        'with',
        'from',
        'claim',
        'claims',
        'true',
        'false',
      ].includes(w),
  );
}
function score(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.reduce((n, word) => n + (lower.includes(word) ? 1 : 0), 0);
}
function id(url: string) {
  return `web:${createHash('sha256').update(url).digest('hex').slice(0, 20)}`;
}
function evidence(
  url: string,
  title: string,
  text: string,
  kind: WebEvidence['kind'],
): WebEvidence {
  return {
    id: id(url),
    url,
    title: title.slice(0, 300),
    text,
    kind,
    retrieved_at: new Date().toISOString(),
    attribution:
      kind === 'encyclopedia'
        ? 'Wikipedia contributors · CC BY-SA 4.0; revision linked'
        : `Public report · ${new URL(url).hostname}`,
  };
}

export async function researchPublicSources(queries: string[]) {
  const deadline = Date.now() + 30000;
  const results: WebEvidence[] = [];
  const limitations: string[] = [];
  const selected = new Map<number, string>();
  // Search requests contain only model-selected public-topic keywords, never history.
  for (const query of queries.slice(0, 2)) {
    let body;
    try {
      body = JSON.parse(
        await readPublic(
          wikiUrl({ action: 'query', list: 'search', srsearch: query.slice(0, 180), srlimit: '2' }),
          true,
          false,
          deadline,
        ),
      );
    } catch {
      throw new AiServiceError(
        'RESEARCH_UNAVAILABLE',
        'Public-source search is unavailable. No historical assessment was produced. Please retry.',
      );
    }
    if (body.error || !Array.isArray(body.query?.search))
      throw new AiServiceError('RESEARCH_UNAVAILABLE');
    for (const page of body.query.search)
      if (Number.isInteger(page.pageid)) selected.set(page.pageid, page.title);
  }
  const words = terms(queries.join(' '));
  const reports = new Set<string>();
  for (const [pageid, title] of [...selected].slice(0, 3)) {
    try {
      const raw = JSON.parse(
        await readPublic(
          wikiUrl({
            action: 'parse',
            pageid: String(pageid),
            prop: 'text|revid',
            disableeditsection: '1',
          }),
          true,
          true,
          deadline,
        ),
      );
      if (!raw.parse?.text || !Number.isInteger(raw.parse.revid))
        throw new Error('PAGE_UNAVAILABLE');
      const $ = load(raw.parse.text);
      $('script,style,nav,table,.mw-editsection,.hatnote,.reflist,.reference-list').remove();
      const blocks = $('p')
        .toArray()
        .map((node, index) => ({
          node,
          index,
          text: $(node)
            .text()
            .replace(/\[\d+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim(),
        }));
      const ranked = blocks
        .filter((b) => b.text.length > 60 && score(b.text, words) >= Math.min(2, words.length))
        .sort((a, b) => score(b.text, words) - score(a.text, words))
        .slice(0, 5);
      if (!ranked.length) continue;
      const revision = `https://en.wikipedia.org/w/index.php?oldid=${raw.parse.revid}`;
      results.push(
        evidence(
          revision,
          title,
          ranked
            .sort((a, b) => a.index - b.index)
            .map((b) => b.text)
            .join('\n\n')
            .slice(0, 8500),
          'encyclopedia',
        ),
      );
      // Reparse references: they were removed above to avoid treating bibliography
      // as article assertions, but their links can identify the underlying reports.
      const refs = load(raw.parse.text);
      for (const b of ranked) {
        for (const a of $(b.node).find('sup.reference a').toArray()) {
          const ref = ($(a).attr('href') ?? '').split('#').at(-1);
          if (!ref) continue;
          refs(`[id="${ref.replace(/[^\w.-]/g, '')}"] a.external`).each((_i, link) => {
            const href = refs(link).attr('href');
            const secure = href?.replace(/^http:\/\//, 'https://');
            if (secure && permittedResearchUrl(secure)) reports.add(secure.split('#')[0]);
          });
        }
      }
    } catch {
      limitations.push(`The article ${title} could not be retrieved.`);
    }
  }
  for (const url of [...reports].slice(0, 3)) {
    try {
      const $ = load(await readPublic(url, false, true, deadline));
      $('script,style,nav,footer,header,aside,form').remove();
      const paragraphs = $('p, li')
        .toArray()
        .map((p) => $(p).text().replace(/\s+/g, ' ').trim())
        .filter((p) => p.length > 60);
      const relevant = paragraphs
        .map((text, index) => ({ text, index, relevance: score(text, words) }))
        .filter((p) => p.relevance >= Math.min(2, words.length))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 8)
        .sort((a, b) => a.index - b.index)
        .map((p) => p.text);
      if (!relevant.length) {
        limitations.push(
          `No relevant readable report was retrieved from ${new URL(url).hostname}.`,
        );
        continue;
      }
      results.push(
        evidence(
          url,
          $('title').text().trim() || new URL(url).hostname,
          relevant.slice(0, 8).join('\n\n').slice(0, 7000),
          'referenced_report',
        ),
      );
    } catch {
      limitations.push(`A referenced report on ${new URL(url).hostname} was unavailable.`);
    }
  }
  if (selected.size && !results.length && limitations.length)
    throw new AiServiceError(
      'RESEARCH_UNAVAILABLE',
      'The discovered public sources could not be read. No historical assessment was produced. Please retry.',
    );
  return { sources: [...new Map(results.map((s) => [s.id, s])).values()], limitations };
}
