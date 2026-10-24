import type { Database } from '../../db/src/index.ts';
import { getWorks } from '../../db/src/queries.ts';
import { readingThemes } from '../../shared/src/themes.ts';
import type { SearchHit } from '../../shared/src/index.ts';
import { searchPassages } from './index.ts';
export async function browseTheme(db: Database, slug: string, work?: string) {
  const theme = readingThemes.find((t) => t.slug === slug);
  if (!theme) return null;
  const works = (await getWorks(db)).filter((w) => !work || w.slug === work),
    groups: SearchHit[][] = [];
  for (const w of works) {
    const found: SearchHit[] = [];
    for (const query of theme.queries) {
      const matches = await searchPassages(db, query, {
        mode: 'exact',
        work: String(w.slug),
        limit: 2,
      });
      for (const hit of matches)
        if (!found.some((h) => h.passage.id === hit.passage.id)) found.push(hit);
      if (found.length >= 2) break;
    }
    if (found.length) groups.push(found.slice(0, 2));
  }
  return {
    hits: [0, 1].flatMap((i) => groups.flatMap((group) => (group[i] ? [group[i]] : []))),
    note: `${theme.name}: an editorial keyword trail through the available texts. These are wording matches, not a claim that traditions use these ideas in the same way. Read each passage in its own context.`,
  };
}
