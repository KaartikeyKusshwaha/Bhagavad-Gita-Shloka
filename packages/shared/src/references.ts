import catalog from './library-catalog.json';
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const entries = catalog.map((w) => ({
  id: w.id,
  prefix: w.metadata.reference_prefix,
  aliases: [
    w.metadata.reference_prefix,
    ...('aliases' in w.metadata ? (w.metadata.aliases as string[]) : []),
  ],
}));
const aliases = entries
  .flatMap((w) => w.aliases.map((alias) => ({ work: w.id, prefix: w.prefix, alias })))
  .sort((a, b) => b.alias.length - a.alias.length);
for (const w of catalog as { id: string; metadata: { reference_units?: string[] } }[])
  for (const unit of w.metadata.reference_units ?? [])
    aliases.unshift({ work: w.id, prefix: unit, alias: unit });
export function parsePassageReference(input: string, selectedWork?: string) {
  const text = input.trim();
  for (const entry of aliases) {
    const match = text.match(
      new RegExp(`^${escape(entry.alias)}\\s+(\\d+(?:[.:]\\d+){1,3})$`, 'i'),
    );
    if (match) return { work: entry.work, ref: `${entry.prefix} ${match[1].replaceAll(':', '.')}` };
  }
  const selected = entries.find((w) => w.id === selectedWork),
    bare = text.match(/^(\d+(?:[.:]\d+){1,3})$/);
  if (selected && bare)
    return { work: selected.id, ref: `${selected.prefix} ${bare[1].replaceAll(':', '.')}` };
  const dhp = text.match(/^(?:dhp|dhammapada)\s*[:.-]?\s*(\d{1,3})$/i);
  if (dhp) return { work: 'dhammapada', ref: `Dhp ${Number(dhp[1])}` };
  const quran = text.match(/^(?:quran|qur['’]?an|koran)\s*(\d{1,3})[.:](\d{1,3})$/i);
  if (quran) return { work: 'quran', ref: `Quran ${Number(quran[1])}:${Number(quran[2])}` };
  const gita = text.match(/^(?:(?:bg|gita|bhagavad[ -]gita)\s*[-:]?\s*)?(\d{1,3})[.:](\d{1,3})$/i);
  if (!gita) return null;
  const explicitGita = /^(?:bg|gita|bhagavad)/i.test(text);
  if (!explicitGita && selectedWork === 'quran')
    return { work: 'quran', ref: `Quran ${Number(gita[1])}:${Number(gita[2])}` };
  return { work: 'bhagavad-gita', ref: `BG ${Number(gita[1])}.${Number(gita[2])}` };
}
export function findPassageReference(input: string, selectedWork?: string) {
  for (const entry of aliases) {
    const match = input.match(
      new RegExp(`(?:^|\\b)(${escape(entry.alias)}\\s+\\d+(?:[.:]\\d+){1,3})(?![.\\d])`, 'i'),
    );
    if (match) return parsePassageReference(match[1], selectedWork);
  }
  const match = input.match(
    /(?:\b(?:BG|Gita|Quran|Koran)\s*)?\d{1,3}[.:]\d{1,3}|\b(?:Dhp|Dhammapada)\s+\d{1,3}/i,
  );
  return match ? parsePassageReference(match[0], selectedWork) : null;
}
export function findAllPassageReferences(input: string) {
  const refs = [];
  for (const entry of aliases)
    for (const m of input.matchAll(
      new RegExp(`(?:^|\\b)(${escape(entry.alias)}\\s+\\d+(?:[.:]\\d+){1,3})(?![.\\d])`, 'gi'),
    )) {
      const ref = parsePassageReference(m[1]);
      if (ref) refs.push(ref);
    }
  for (const m of input.matchAll(/\b(?:BG\s*\d+[.:]\d+|Quran\s*\d+[.:]\d+|Dhp\s*\d+)/gi)) {
    const ref = parsePassageReference(m[0]);
    if (ref) refs.push(ref);
  }
  return refs;
}
