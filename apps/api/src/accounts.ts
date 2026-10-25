import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Database } from '../../../packages/db/src/index.ts';
import { parseAccountData, emptyLearning } from '../../../packages/shared/src/account-data.ts';
import { emptyDeviceData } from '../../../packages/shared/src/device-data.ts';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const credentials = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,32}$/),
  password: z.string().min(12).max(128),
});
let hashing = false;
export async function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  if (hashing) throw Object.assign(new Error('Password service busy'), { statusCode: 503 });
  hashing = true;
  try {
    const key = await new Promise<Buffer>((resolve, reject) =>
      scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (err, key) =>
        err ? reject(err) : resolve(key),
      ),
    );
    return `${salt}:${key.toString('hex')}`;
  } finally {
    hashing = false;
  }
}
async function matches(password: string, stored: string) {
  const candidate = await hashPassword(password, stored.split(':')[0]);
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(stored));
}
export async function registerAccounts(app: FastifyInstance, db: Database) {
  const secure = process.env.NODE_ENV === 'production';
  const cookieName = secure ? '__Host-scripture-session' : 'scripture-session';
  const cookie = (token: string, age: number) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`;
  const fail = (reply: FastifyReply, status: number, message: string) =>
    reply.code(status).send({ error: { code: 'ACCOUNT_ERROR', message } });
  async function identity(req: FastifyRequest) {
    const token = req.headers.cookie
      ?.split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const { rows } = await db.query<{ id: string; username: string; name: string }>(
      'SELECT a.id,a.username,a.name FROM reader_accounts a JOIN reader_sessions s ON s.account_id=a.id WHERE s.token_hash=$1 AND s.expires_at>now()',
      [digest(token)],
    );
    return rows[0] ?? null;
  }
  async function session(reply: FastifyReply, id: string) {
    const token = randomBytes(32).toString('hex');
    await db.query('DELETE FROM reader_sessions WHERE expires_at<=now()');
    await db.query("INSERT INTO reader_sessions VALUES($1,$2,now()+interval '7 days')", [
      digest(token),
      id,
    ]);
    reply.header('Set-Cookie', cookie(token, 604800));
  }
  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/v1/account')) return;
    reply.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(req.method)) {
      // Custom header cannot be sent by a cross-origin form; CORS is deliberately disabled.
      if (
        req.headers['x-scripture-client'] !== '1' ||
        req.headers['sec-fetch-site'] === 'cross-site'
      )
        return fail(reply, 403, 'Please use the account controls on this website.');
      if (req.headers.origin) {
        const expected = `${req.protocol}://${req.host}`;
        if (req.headers.origin !== expected)
          return fail(reply, 403, 'Account request origin did not match.');
      }
    }
  });
  app.get('/v1/account', async (req) => ({ user: await identity(req) }));
  const limit = { rateLimit: { max: 5, timeWindow: '15 minutes' } };
  app.post('/v1/account/signup', { config: limit }, async (req, reply) => {
    const body = credentials.extend({ name: z.string().trim().min(1).max(80) }).parse(req.body);
    const id = randomUUID(),
      recoveryCode = randomBytes(24).toString('hex');
    const password = await hashPassword(body.password);
    const created = await db.transaction(async (tx) => {
      const result = await tx.query(
        'INSERT INTO reader_accounts(id,username,name,password_hash,recovery_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(username) DO NOTHING RETURNING id',
        [id, body.username, body.name, password, digest(recoveryCode)],
      );
      if (!result.rows.length) return false;
      await tx.query('INSERT INTO reader_data(account_id) VALUES($1)', [id]);
      return true;
    });
    if (!created) return fail(reply, 409, 'That username is unavailable. Choose another.');
    await session(reply, id);
    return { user: { id, username: body.username, name: body.name }, recoveryCode };
  });
  app.post('/v1/account/signin', { config: limit }, async (req, reply) => {
    const body = credentials.parse(req.body);
    const { rows } = await db.query<{
      id: string;
      username: string;
      name: string;
      password_hash: string;
    }>('SELECT id,username,name,password_hash FROM reader_accounts WHERE username=$1', [
      body.username,
    ]);
    // Run the same expensive comparison for unknown usernames.
    const row = rows[0],
      valid = await matches(
        body.password,
        row?.password_hash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`,
      );
    if (!row || !valid) return fail(reply, 401, 'Username or password is incorrect.');
    await session(reply, row.id);
    return { user: { id: row.id, username: row.username, name: row.name } };
  });
  app.post('/v1/account/recover', { config: limit }, async (req, reply) => {
    const body = credentials
      .extend({ recoveryCode: z.string().regex(/^[a-f0-9]{48}$/) })
      .parse(req.body);
    const recoveryCode = randomBytes(24).toString('hex'),
      password = await hashPassword(body.password);
    const id = await db.transaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        'UPDATE reader_accounts SET password_hash=$1,recovery_hash=$2 WHERE username=$3 AND recovery_hash=$4 RETURNING id',
        [password, digest(recoveryCode), body.username, digest(body.recoveryCode)],
      );
      if (!rows[0]) return null;
      await tx.query('DELETE FROM reader_sessions WHERE account_id=$1', [rows[0].id]);
      return rows[0].id;
    });
    if (!id) return fail(reply, 401, 'Username or recovery code is incorrect.');
    reply.header('Set-Cookie', cookie('', 0));
    return { recoveryCode };
  });
  app.post('/v1/account/signout', async (req, reply) => {
    const user = await identity(req);
    if (user) {
      const token = req.headers.cookie
        ?.split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1);
      if (token) await db.query('DELETE FROM reader_sessions WHERE token_hash=$1', [digest(token)]);
    }
    reply.header('Set-Cookie', cookie('', 0));
    return { ok: true };
  });
  app.get('/v1/account/data', async (req, reply) => {
    const user = await identity(req);
    if (!user) return fail(reply, 401, 'Sign in to access your dashboard.');
    const { rows } = await db.query<{ revision: number; payload: Record<string, unknown> }>(
      'SELECT revision,payload FROM reader_data WHERE account_id=$1',
      [user.id],
    );
    return {
      revision: rows[0].revision,
      data: Object.keys(rows[0].payload).length
        ? parseAccountData(rows[0].payload)
        : { device: emptyDeviceData, learning: emptyLearning },
    };
  });
  app.put('/v1/account/data', { bodyLimit: 4 * 1024 * 1024 }, async (req, reply) => {
    const user = await identity(req);
    if (!user) return fail(reply, 401, 'Your session expired. Sign in again.');
    const body = z
        .object({
          accountId: z.string().uuid(),
          revision: z.number().int().nonnegative(),
          data: z.unknown(),
        })
        .parse(req.body),
      data = parseAccountData(body.data);
    if (body.accountId !== user.id)
      return fail(reply, 401, 'Your active account changed. Reload before saving.');
    const { rows } = await db.query<{ revision: number }>(
      'UPDATE reader_data SET payload=$1::jsonb,revision=revision+1 WHERE account_id=$2 AND revision=$3 RETURNING revision',
      [JSON.stringify(data), user.id, body.revision],
    );
    if (!rows.length)
      return fail(
        reply,
        409,
        'Your dashboard changed on another device. Reload to use the latest saved version.',
      );
    return { revision: rows[0].revision };
  });
  app.delete('/v1/account', { config: limit }, async (req, reply) => {
    const user = await identity(req);
    if (!user) return fail(reply, 401, 'Sign in first.');
    const { password } = z.object({ password: z.string().max(128) }).parse(req.body);
    const { rows } = await db.query<{ password_hash: string }>(
      'SELECT password_hash FROM reader_accounts WHERE id=$1',
      [user.id],
    );
    if (!(await matches(password, rows[0].password_hash)))
      return fail(reply, 401, 'Password is incorrect.');
    await db.query('DELETE FROM reader_accounts WHERE id=$1', [user.id]);
    reply.header('Set-Cookie', cookie('', 0));
    return { ok: true };
  });
}
