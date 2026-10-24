import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { parse } from 'yaml';
import { licenseGate } from '../packages/ingest/src/licenseGate.ts';
import { connectDatabase } from '../packages/db/src/index.ts';
import { migrate } from '../packages/db/src/migrate.ts';
import { ingestGita } from '../packages/ingest/src/index.ts';
const bytes = await readFile('data/imports/gita.json');
const checksum = createHash('sha256').update(bytes).digest('hex');
for (const file of await readdir('data/sources'))
  if (file.endsWith('.yml')) {
    const record = licenseGate(parse(await readFile(`data/sources/${file}`, 'utf8')));
    if (record.checksum !== checksum) throw new Error(`Source checksum mismatch: ${file}`);
  }
const db = await connectDatabase(
  process.env.DATABASE_URL || process.env.DATABASE_MODE ? undefined : { memory: true },
);
try {
  await migrate(db);
  await ingestGita(db);
  const unpublished = (
    await db.query(
      "SELECT p.id FROM published_passages p JOIN sources s ON s.id=p.source_id WHERE s.status<>'approved' UNION ALL SELECT tr.id FROM published_translations tr JOIN sources s ON s.id=tr.source_id WHERE s.status<>'approved'",
    )
  ).rows;
  if (unpublished.length) throw new Error('Published text references an unapproved source');
  const passages = (
    await db.query(
      'SELECT original_text AS text FROM passages UNION ALL SELECT text FROM translations',
    )
  ).rows;
  for (const row of passages) {
    const text = String(row.text);
    if (text !== text.normalize('NFC') || /<[^>]+>|Proofreadpage|data-mw|\{\s*"/.test(text))
      throw new Error('Text is not clean NFC scripture or translation');
  }
  const counts = (
    await db.query(
      'SELECT (SELECT count(*) FROM published_passages)::int AS passages,(SELECT count(*) FROM published_translations)::int AS translations',
    )
  ).rows[0];
  if (counts.passages !== 700 || counts.translations !== 700)
    throw new Error(`Unexpected Gita import counts: ${JSON.stringify(counts)}`);
  console.log(
    JSON.stringify({
      status: 'pass',
      ...counts,
      checksum,
      editorial_samples: 'pending human signoff',
    }),
  );
} finally {
  await db.close();
}
