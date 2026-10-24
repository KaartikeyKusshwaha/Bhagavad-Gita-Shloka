import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { vector } from '@electric-sql/pglite-pgvector';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
export interface Database {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  transaction<T>(work: (db: Database) => Promise<T>): Promise<T>;
}
export async function connectDatabase(options?: { memory?: boolean }): Promise<Database> {
  if (options?.memory || process.env.DATABASE_MODE === 'pglite') {
    if (process.env.NODE_ENV === 'production' && !options?.memory)
      throw new Error('Production requires PostgreSQL DATABASE_URL');
    const dataDir = options?.memory
      ? undefined
      : resolve(process.env.PGLITE_PATH || '.local/postgres');
    if (dataDir) await mkdir(dirname(dataDir), { recursive: true });
    const db = new PGlite({ dataDir, extensions: { pg_trgm, vector } });
    await db.waitReady;
    return {
      query: (sql, params) => db.query(sql, params),
      exec: async (sql) => {
        await db.exec(sql);
      },
      close: () => db.close(),
      transaction: (work) =>
        db.transaction(async (tx) => {
          const scoped: Database = {
            query: (sql, params) => tx.query(sql, params),
            exec: async (sql) => {
              await tx.exec(sql);
            },
            close: async () => {},
            transaction: (callback) => callback(scoped),
          };
          return work(scoped);
        }),
    };
  }
  if (!process.env.DATABASE_URL)
    throw new Error('Set DATABASE_URL or explicit local DATABASE_MODE=pglite');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 10000,
    statement_timeout: 10000,
  });
  await pool.query('SELECT 1');
  return {
    query: (sql, params) => pool.query(sql, params),
    exec: async (sql) => {
      await pool.query(sql);
    },
    close: () => pool.end(),
    transaction: async (work) => {
      const client = await pool.connect();
      const scoped: Database = {
        query: (sql, params) => client.query(sql, params),
        exec: async (sql) => {
          await client.query(sql);
        },
        close: async () => {},
        transaction: (callback) => callback(scoped),
      };
      try {
        await client.query('BEGIN');
        const result = await work(scoped);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
// Next's server bundle and the Fastify entry share the same process, including local PGlite.
const registry = globalThis as typeof globalThis & { __openScriptureDatabase?: Promise<Database> };
export function getDatabase() {
  return (registry.__openScriptureDatabase ??= connectDatabase());
}
export function setDatabase(db: Database) {
  registry.__openScriptureDatabase = Promise.resolve(db);
}
