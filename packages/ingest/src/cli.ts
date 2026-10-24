import { connectDatabase } from '../../db/src/index.ts';
import { migrate } from '../../db/src/migrate.ts';
import { ingestGita, publishSource } from './index.ts';
import { freeCollections, ingestCollection } from './collections.ts';
const db = await connectDatabase();
try {
  await migrate(db);
  if (process.argv[2] === 'publish') await publishSource(db, process.argv[3]);
  else if (process.argv[2] === 'gita') console.log(await ingestGita(db));
  else if (process.argv[2] === 'all') {
    console.log(await ingestGita(db));
    for (const slug of freeCollections) console.log(await ingestCollection(db, slug));
  } else
    throw new Error('Usage: pnpm ingest all | pnpm ingest gita | pnpm ingest publish <source-id>');
} finally {
  await db.close();
}
