import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { connectDatabase, type Database } from './index.ts';
export async function migrate(db: Database) {
  await db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())',
  );
  const directory = fileURLToPath(new URL('../migrations/', import.meta.url));
  for (const name of (await readdir(directory)).filter((x) => x.endsWith('.sql')).sort()) {
    if ((await db.query('SELECT name FROM schema_migrations WHERE name=$1', [name])).rows.length)
      continue;
    const sql = await readFile(resolve(directory, name), 'utf8');
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const db = await connectDatabase();
  try {
    await migrate(db);
    console.log('Migrations applied');
  } finally {
    await db.close();
  }
}
