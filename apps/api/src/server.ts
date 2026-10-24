import { connectDatabase, setDatabase } from '../../../packages/db/src/index.ts';
import { migrate } from '../../../packages/db/src/migrate.ts';
import { ingestGita } from '../../../packages/ingest/src/index.ts';
import { freeCollections, ingestCollection } from '../../../packages/ingest/src/collections.ts';
import { createApp } from './app.ts';
import { resolve } from 'node:path';
const production = process.argv.includes('--production');
if (production) Object.assign(process.env, { NODE_ENV: 'production' });
if (production && (!process.env.RATE_LIMIT_SECRET || !process.env.ADMIN_TOKEN))
  throw new Error('Set persistent ADMIN_TOKEN and RATE_LIMIT_SECRET');
const db = await connectDatabase();
setDatabase(db);
await migrate(db);
if (!(await db.query("SELECT id FROM works WHERE id='bhagavad-gita'")).rows.length)
  await ingestGita(db);
for (const slug of freeCollections)
  if (!(await db.query('SELECT id FROM works WHERE id=$1', [slug])).rows.length)
    await ingestCollection(db, slug);
const app = await createApp(db, { web: true });
const host = process.env.HOST ?? '127.0.0.1',
  port = Number(process.env.PORT ?? 3100);
const { default: next } = await import('next');
const web = next({ dev: !production, dir: resolve('apps/web'), hostname: host, port });
await web.prepare();
const handler = web.getRequestHandler();
app.setNotFoundHandler(async (req, reply) => {
  if (req.url.startsWith('/v1/'))
    return reply
      .code(404)
      .send({ error: { code: 'NOT_FOUND', message: 'No API endpoint at this address.' } });
  reply.hijack();
  await handler(req.raw, reply.raw);
});
await app.listen({ host, port });
console.log(`Open Scripture: http://${host}:${port}`);
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    await app.close();
    await web.close();
    await db.close();
    process.exit(0);
  });
