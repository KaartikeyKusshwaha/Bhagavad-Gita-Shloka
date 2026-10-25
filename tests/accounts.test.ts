import { beforeAll, afterAll, it, expect } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { connectDatabase, type Database } from '../packages/db/src/index.ts';
import { migrate } from '../packages/db/src/migrate.ts';
import { createApp } from '../apps/api/src/app.ts';
import { emptyDeviceData } from '../packages/shared/src/device-data.ts';
import { emptyLearning } from '../packages/shared/src/account-data.ts';
let db: Database, app: FastifyInstance;
beforeAll(async () => {
  db = await connectDatabase({ memory: true });
  await migrate(db);
  app = await createApp(db);
}, 30000);
afterAll(async () => {
  await app.close();
  await db.close();
});
let counter = 1;
function request(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body?: unknown,
  cookie = '',
) {
  return app.inject({
    method,
    url: `/v1/account${url}`,
    headers: { 'x-scripture-client': '1', cookie },
    ...(body === undefined ? {} : { payload: body as Record<string, unknown> }),
    remoteAddress: `10.0.0.${counter++}`,
  });
}
it('isolates private dashboards, prevents stale overwrites and cross-account writes, revokes sessions on recovery and deletes account data', async () => {
  expect((await request('GET', '/data')).statusCode).toBe(401);
  const body = { username: 'reader_a', name: 'First reader', password: 'test-only-long-password' };
  const signup = await request('POST', '/signup', body);
  expect(signup.statusCode).toBe(200);
  const cookie = String(signup.headers['set-cookie']).split(';')[0],
    first = signup.json();
  expect(signup.headers['set-cookie']).toContain('HttpOnly');
  expect(signup.headers['set-cookie']).toContain('SameSite=Lax');
  expect((await request('POST', '/signup', body)).statusCode).toBe(409);
  expect((await request('GET', '', undefined, cookie)).headers['cache-control']).toBe('no-store');
  const personal = {
    device: { ...emptyDeviceData, readPassages: ['bg.2.47'] },
    learning: {
      ...emptyLearning,
      plan: { work: 'bhagavad-gita', title: 'My lesson', daily: 2, cursor: 1, total: 700 },
    },
  };
  expect(
    (
      await request(
        'PUT',
        '/data',
        { accountId: first.user.id, revision: 0, data: personal },
        cookie,
      )
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await request(
        'PUT',
        '/data',
        { accountId: first.user.id, revision: 0, data: personal },
        cookie,
      )
    ).statusCode,
  ).toBe(409);
  const other = await request('POST', '/signup', { ...body, username: 'reader_b' }),
    otherCookie = String(other.headers['set-cookie']).split(';')[0];
  expect(
    (await request('GET', '/data', undefined, otherCookie)).json().data.device.readPassages,
  ).toEqual([]);
  expect(
    (
      await request(
        'PUT',
        '/data',
        { accountId: first.user.id, revision: 0, data: personal },
        otherCookie,
      )
    ).statusCode,
  ).toBe(401);
  expect((await request('GET', '/data', undefined, cookie)).json().data.learning.plan.title).toBe(
    'My lesson',
  );
  const forged = await app.inject({
    method: 'POST',
    url: '/v1/account/signout',
    headers: { cookie },
  });
  expect(forged.statusCode).toBe(403);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/v1/account/signout',
        headers: { cookie, 'x-scripture-client': '1', origin: 'https://evil.example' },
      })
    ).statusCode,
  ).toBe(403);
  expect(
    (await request('POST', '/signin', { ...body, password: 'incorrect-long-password' })).statusCode,
  ).toBe(401);
  const recovered = await request('POST', '/recover', {
    username: body.username,
    password: 'new-long-test-password',
    recoveryCode: first.recoveryCode,
  });
  expect(recovered.statusCode).toBe(200);
  expect((await request('GET', '/data', undefined, cookie)).statusCode).toBe(401);
  expect(
    (await request('POST', '/recover', { ...body, recoveryCode: first.recoveryCode })).statusCode,
  ).toBe(401);
  const signin = await request('POST', '/signin', {
      username: body.username,
      password: 'new-long-test-password',
    }),
    newCookie = String(signin.headers['set-cookie']).split(';')[0];
  expect(
    (await request('GET', '/data', undefined, newCookie)).json().data.device.readPassages,
  ).toEqual(['bg.2.47']);
  expect((await request('DELETE', '', { password: 'bad' }, newCookie)).statusCode).toBe(401);
  expect(
    (await request('DELETE', '', { password: 'new-long-test-password' }, newCookie)).statusCode,
  ).toBe(200);
  expect((await request('GET', '/data', undefined, newCookie)).statusCode).toBe(401);
  expect(
    (await db.query('SELECT * FROM reader_data WHERE account_id=$1', [first.user.id])).rows,
  ).toEqual([]);
  expect((await request('POST', '/signout', undefined, otherCookie)).statusCode).toBe(200);
  expect((await request('GET', '/data', undefined, otherCookie)).statusCode).toBe(401);
}, 20000);
it('limits authentication attempts and rejects malformed or oversized account data', async () => {
  const wrong = { username: 'nobody', password: 'wrong-long-password' };
  for (let i = 0; i < 5; i++)
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/account/signin',
          headers: { 'x-scripture-client': '1' },
          payload: wrong,
          remoteAddress: '10.9.1.1',
        })
      ).statusCode,
    ).toBe(401);
  expect(
    (
      await app.inject({
        method: 'POST',
        url: '/v1/account/signin',
        headers: { 'x-scripture-client': '1' },
        payload: wrong,
        remoteAddress: '10.9.1.1',
      })
    ).statusCode,
  ).toBe(429);
  expect(
    (await request('POST', '/signup', { username: 'x', name: 'Bad', password: 'short' }))
      .statusCode,
  ).toBe(400);
}, 20000);
