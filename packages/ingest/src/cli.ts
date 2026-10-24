import { connectDatabase } from '../../db/src/index.ts';
import { migrate } from '../../db/src/migrate.ts';
import { ingestGita, publishSource } from './index.ts';
import { freeCollections, ingestCollection } from './collections.ts';
import { ingestAudio } from './audio.ts';
import { ingestGitaComparison } from './comparison.ts';
const db = await connectDatabase();
try {
  await migrate(db);
  if (process.argv[2] === 'publish') await publishSource(db, process.argv[3]);
  else if (process.argv[2] === 'gita') console.log(await ingestGita(db));
  else if (process.argv[2] === 'all') {
    console.log(await ingestGita(db));
    console.log(await ingestGitaComparison(db));
    for (const slug of freeCollections) console.log(await ingestCollection(db, slug));
    console.log(await ingestAudio(db));
  } else
    throw new Error('Usage: pnpm ingest all | pnpm ingest gita | pnpm ingest publish <source-id>');
} finally {
  await db.close();
}
