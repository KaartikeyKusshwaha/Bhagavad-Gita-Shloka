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
it('keeps lightweight account checks separate from the public reading budget', async () => {
  for (let i = 0; i < 120; i++)
    expect(
      (await app.inject({ method: 'GET', url: '/v1/account', remoteAddress: '10.9.1.2' }))
        .statusCode,
    ).toBe(200);
  expect(
    (await app.inject({ method: 'GET', url: '/v1/account', remoteAddress: '10.9.1.2' })).statusCode,
  ).toBe(429);
  expect(
    (await app.inject({ method: 'GET', url: '/v1/traditions', remoteAddress: '10.9.1.2' }))
      .statusCode,
  ).toBe(200);
});
it('accepts any valid email as a login address and routes new addresses to signup without creating accounts implicitly', async () => {
  const body = {
    email: 'reader.fixture+college@gmail.com',
    name: 'Email reader',
    password: 'long-email-test-password',
  };
  expect((await request('POST', '/identify', { identifier: body.email })).json().next).toBe(
    'signup',
  );
  const created = await request('POST', '/signup', {
    ...body,
    email: ' READER.FIXTURE+COLLEGE@GMAIL.COM ',
  });
  expect(created.statusCode).toBe(200);
  const first = created.json(),
    cookie = String(created.headers['set-cookie']).split(';')[0];
  expect((await request('GET', '', undefined, cookie)).json().user.email).toBe(body.email);
  expect((await request('GET', '', undefined, cookie)).json().user.password_login).toBe(true);
  expect(
    (await request('POST', '/identify', { identifier: body.email.toUpperCase() })).json(),
  ).toMatchObject({ next: 'signin', password_login: true });
  expect((await request('POST', '/signup', body)).statusCode).toBe(409);
  expect(
    (
      await request('POST', '/signin', {
        identifier: body.email.toUpperCase(),
        password: body.password,
      })
    ).statusCode,
  ).toBe(200);
  expect(
    (
      await request('POST', '/signin', {
        identifier: body.email,
        password: 'wrong-email-test-password',
      })
    ).statusCode,
  ).toBe(401);
  expect(
    (await request('POST', '/identify', { identifier: 'new-reader@outlook.com' })).json().next,
  ).toBe('signup');
  expect(
    (await db.query('SELECT id FROM reader_accounts WHERE email=$1', ['new-reader@outlook.com']))
      .rows,
  ).toHaveLength(0);
  expect(
    (
      await request('POST', '/recover', {
        identifier: body.email,
        password: 'changed-email-test-password',
        recoveryCode: first.recoveryCode,
      })
    ).statusCode,
  ).toBe(200);
  expect((await request('GET', '/data', undefined, cookie)).statusCode).toBe(401);
  expect((await request('POST', '/signup', { ...body, email: 'not-an-email' })).statusCode).toBe(
    400,
  );
});
it('exposes only configured Google sign-in and binds one-time OAuth state to its initiating browser', async () => {
  const { vi } = await import('vitest');
  expect((await request('GET', '/options')).json().google).toBe(false);
  expect((await request('POST', '/google/start', { purpose: 'signin' })).statusCode).toBe(503);
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client.apps.googleusercontent.com');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret-not-a-real-key');
  vi.stubEnv('AUTH_PUBLIC_ORIGIN', 'https://scripture.example.test');
  try {
    expect((await request('GET', '/options')).json().google).toBe(true);
    expect((await request('POST', '/google/start', { purpose: 'link' })).statusCode).toBe(401);
    const start = await request('POST', '/google/start', { purpose: 'signin' }),
      url = new URL(start.json().url),
      cookie = String(start.headers['set-cookie']).split(';')[0];
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://scripture.example.test/v1/account/google/callback',
    );
    const state = url.searchParams.get('state');
    const forged = await request('GET', `/google/callback?state=${state}&code=fake`);
    expect(forged.headers.location).toContain('googleError=state');
    const cancelled = await request(
      'GET',
      `/google/callback?state=${state}&error=access_denied`,
      undefined,
      cookie,
    );
    expect(cancelled.headers.location).toContain('googleError=cancelled');
    const replay = await request(
      'GET',
      `/google/callback?state=${state}&code=fake`,
      undefined,
      cookie,
    );
    expect(replay.headers.location).toContain('googleError=state');
  } finally {
    vi.unstubAllEnvs();
  }
});
