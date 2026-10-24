import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'yaml';
import { licenseGate } from '../packages/ingest/src/licenseGate.ts';
import { ingestAudio } from '../packages/ingest/src/audio.ts';
import { connectDatabase } from '../packages/db/src/index.ts';
import { migrate } from '../packages/db/src/migrate.ts';
import { ingestGita } from '../packages/ingest/src/index.ts';
import {
  freeCollections,
  ingestCollection,
  readCollection,
} from '../packages/ingest/src/collections.ts';
const preserveVerbatim = new Set<string>();
for (const file of await readdir('data/sources'))
  if (file.endsWith('.yml')) {
    const record = licenseGate(parse(await readFile(`data/sources/${file}`, 'utf8')));
    const bundle = String(record.display_rules.bundle ?? 'gita.json');
    if (!/^[a-z-]+\.json$/.test(bundle)) throw new Error('Invalid source bundle path');
    const checksum = createHash('sha256')
      .update(await readFile(`data/imports/${bundle}`))
      .digest('hex');
    if (record.checksum !== checksum) throw new Error(`Source checksum mismatch: ${file}`);
    if (record.display_rules.preserve_verbatim) preserveVerbatim.add(record.id);
  }
const quran = (await readCollection('quran')).data;
const lines = quran.passages.map((p) => `${p.chapter}|${p.verse}|${p.original_text}`).join('\n');
if (createHash('sha256').update(lines).digest('hex') !== quran.provenance.verse_lines_sha256)
  throw new Error('Tanzil verse strings differ from the downloaded text');
if (!quran.copyright_notice?.includes('CHANGING IT IS NOT ALLOWED'))
  throw new Error('Missing Tanzil text notice');
const db = await connectDatabase(
  process.env.DATABASE_URL || process.env.DATABASE_MODE ? undefined : { memory: true },
);
try {
  await migrate(db);
  await ingestGita(db);
  for (const slug of freeCollections) await ingestCollection(db, slug);
  await ingestAudio(db);
  const unpublished = (
    await db.query(
      "SELECT p.id FROM published_passages p JOIN sources s ON s.id=p.source_id WHERE s.status<>'approved' UNION ALL SELECT tr.id FROM published_translations tr JOIN sources s ON s.id=tr.source_id WHERE s.status<>'approved'",
    )
  ).rows;
  if (unpublished.length) throw new Error('Published text references an unapproved source');
  const passages = (
    await db.query(
      'SELECT source_id,original_text AS text FROM passages UNION ALL SELECT source_id,text FROM translations',
    )
  ).rows;
  for (const row of passages) {
    const text = String(row.text);
    if (
      (!preserveVerbatim.has(String(row.source_id)) && text !== text.normalize('NFC')) ||
      /<[^>]+>|Proofreadpage|data-mw|\{\s*"/.test(text)
    )
      throw new Error('Text is not clean NFC scripture or translation');
  }
  const counts = (
    await db.query(
      'SELECT (SELECT count(*) FROM published_passages)::int AS passages,(SELECT count(*) FROM published_translations)::int AS translations',
    )
  ).rows[0];
  for (const [work, expected] of [
    ['bhagavad-gita', 700],
    ['quran', 6236],
    ['dhammapada', 423],
  ] as const) {
    const n = Number(
      (await db.query('SELECT count(*) AS n FROM published_passages WHERE work_id=$1', [work]))
        .rows[0].n,
    );
    if (n !== expected) throw new Error(`Unexpected ${work} count: ${n}`);
  }
  console.log(
    JSON.stringify({
      status: 'pass',
      ...counts,
      tanzil_verbatim: 'pass',
      editorial_samples: 'pending human signoff',
    }),
  );
} finally {
  await db.close();
}
