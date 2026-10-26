import { describe, it, expect } from 'vitest';
import { connectDatabase } from './index.ts';
import { migrate } from './migrate.ts';
import { readdir } from 'node:fs/promises';
describe('PostgreSQL schema', () => {
  it('migrates twice, installs search extensions and hides draft sources', async () => {
    const db = await connectDatabase({ memory: true });
    try {
      await migrate(db);
      await migrate(db);
      const expected = (await readdir(new URL('../migrations/', import.meta.url)))
        .filter((name) => name.endsWith('.sql'))
        .sort();
      expect(
        (await db.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map(
          (row) => row.name,
        ),
      ).toEqual(expected);
      expect(
        (await db.query("SELECT similarity('karma','karm') AS score")).rows[0].score,
      ).toBeGreaterThan(0.3);
      await db.query("INSERT INTO traditions VALUES('t','test','Test','beta')");
      await db.query(
        "INSERT INTO sources(id,tradition_id,name,url) VALUES('s','t','Draft','https://example.com')",
      );
      await db.query("INSERT INTO works VALUES('w','t','test','Test','sa',0)");
      await db.query("INSERT INTO divisions(id,work_id,number,title) VALUES('d','w',1,'One')");
      await db.query(
        "INSERT INTO passages VALUES('p','w','d','s','T 1.1',1,1,'Text','text','Latin','','')",
      );
      expect((await db.query('SELECT * FROM published_passages')).rows).toHaveLength(0);
      await expect(db.query("UPDATE sources SET status='approved' WHERE id='s'")).rejects.toThrow();
    } finally {
      await db.close();
    }
  });
});
