import { connectDatabase } from '../../db/src/index.ts';
import { migrate } from '../../db/src/migrate.ts';
import { ingestGita, publishSource } from './index.ts';
const db = await connectDatabase();
try {
  await migrate(db);
  if (process.argv[2] === 'publish') await publishSource(db, process.argv[3]);
  else if (process.argv[2] === 'gita') console.log(await ingestGita(db));
  else throw new Error('Usage: pnpm ingest gita | pnpm ingest publish <source-id>');
} finally {
  await db.close();
}
