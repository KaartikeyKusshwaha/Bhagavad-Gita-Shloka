import { it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { connectDatabase } from '../../db/src/index.ts';
import { migrate } from '../../db/src/migrate.ts';
import { indexEmbeddings, semanticSearch } from './semantic.ts';

it('indexes only eligible sources and rejects stale vectors after text changes', async () => {
  const seen: string[] = [];
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/health') {
      res.end('{"status":"ok"}');
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const input = (JSON.parse(Buffer.concat(chunks).toString()) as { input: string[] }).input;
    seen.push(...input);
    res.end(
      JSON.stringify({
        data: input.map((text, index) => ({
          index,
          embedding: Array.from({ length: 1024 }, (_, i) =>
            i === (text.includes('alpha') ? 0 : 1) ? 1 : 0,
          ),
        })),
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  vi.stubEnv('EMBEDDING_BASE_URL', `http://127.0.0.1:${port}/v1`);
  vi.stubEnv('EMBEDDING_MODEL', 'synthetic-test-model');
  const db = await connectDatabase({ memory: true });
  try {
    await migrate(db);
    await db.query(
      "INSERT INTO traditions VALUES('fixture','fixture','Synthetic fixtures','beta')",
    );
    for (const [id, restricted] of [
      ['allowed', false],
      ['restricted', true],
    ] as const) {
      await db.query(
        `INSERT INTO sources(id,tradition_id,name,url,license,license_url,attribution,retrieved_at,checksum,status,display_rules) VALUES($1,'fixture','Synthetic test fixture','https://example.com','CC0','https://example.com','Synthetic fixture only','2026-10-25','fixture','approved',$2::jsonb)`,
        [id, JSON.stringify({ no_generative_ai: restricted })],
      );
    }
    await db.query(
      "INSERT INTO works VALUES('fixture','fixture','fixture','Synthetic test','en',1)",
    );
    await db.query(
      "INSERT INTO divisions(id,work_id,number,title) VALUES('fixture.1','fixture',1,'Test')",
    );
    for (const [id, source, text, ordinal] of [
      ['alpha', 'allowed', 'fixture alpha text', 1],
      ['beta', 'allowed', 'fixture beta text', 2],
      ['restricted', 'restricted', 'restricted fixture text', 3],
    ] as const)
      await db.query(
        "INSERT INTO passages(id,work_id,division_id,source_id,ref,ordinal,verse_number,original_text,text_norm,original_script) VALUES($1,'fixture','fixture.1',$2,$1,$3,$3,$4,$4,'Latin')",
        [id, source, ordinal, text],
      );
    const coverage = await indexEmbeddings(db);
    expect(coverage.eligible).toBe(2);
    expect(coverage.indexed).toBe(2);
    expect(seen).toEqual(['fixture alpha text', 'fixture beta text']);
    expect((await semanticSearch(db, 'alpha topic'))[0].passage.id).toBe('alpha');
    await db.query("UPDATE passages SET original_text='changed beta fixture' WHERE id='beta'");
    expect((await semanticSearch(db, 'alpha topic')).map((h) => h.passage.id)).toEqual(['alpha']);
    await indexEmbeddings(db);
    expect(seen).toContain('changed beta fixture');
    expect(seen).not.toContain('restricted fixture text');
  } finally {
    await db.close();
    vi.unstubAllEnvs();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 30000);
