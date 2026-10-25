import { it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { verifyGoogleToken, resolveGoogleAccount } from '../apps/api/src/google-auth.ts';
import { connectDatabase, type Database } from '../packages/db/src/index.ts';
import { migrate } from '../packages/db/src/migrate.ts';
let db: Database;
beforeAll(async () => {
  db = await connectDatabase({ memory: true });
  await migrate(db);
}, 30000);
afterAll(async () => {
  await db.close();
});
it('requires a valid Google signature, audience, issuer, nonce and verified email', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const resolver = createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: 'test-google', alg: 'RS256' }],
  });
  const sign = (overrides: Record<string, unknown> = {}) =>
    new SignJWT({
      sub: 'google-test-sub',
      email: 'google.reader@example.com',
      email_verified: true,
      name: 'Google reader',
      nonce: 'one-time-nonce',
      ...overrides,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-google' })
      .setIssuer('https://accounts.google.com')
      .setAudience('test-client')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  const token = await sign();
  expect((await verifyGoogleToken(token, 'test-client', 'one-time-nonce', resolver)).sub).toBe(
    'google-test-sub',
  );
  await expect(
    verifyGoogleToken(token, 'wrong-client', 'one-time-nonce', resolver),
  ).rejects.toThrow();
  await expect(verifyGoogleToken(token, 'test-client', 'wrong-nonce', resolver)).rejects.toThrow();
  await expect(
    verifyGoogleToken(
      await sign({ email_verified: false }),
      'test-client',
      'one-time-nonce',
      resolver,
    ),
  ).rejects.toThrow();
  await expect(
    verifyGoogleToken(
      await sign({ azp: 'another-client' }),
      'test-client',
      'one-time-nonce',
      resolver,
    ),
  ).rejects.toThrow();
  const forged = token.slice(0, -5) + 'AAAAA';
  await expect(
    verifyGoogleToken(forged, 'test-client', 'one-time-nonce', resolver),
  ).rejects.toThrow();
});
it('creates Google accounts once and refuses silent linking to existing email accounts', async () => {
  const profile = {
    sub: 'google-new-reader',
    email: 'new.google@example.com',
    email_verified: true as const,
    name: 'Google reader',
  };
  const first = await resolveGoogleAccount(db, profile);
  expect(await resolveGoogleAccount(db, profile)).toBe(first);
  const { rows } = await db.query<{ password_hash: string | null; email_verified: boolean }>(
    'SELECT password_hash,email_verified FROM reader_accounts WHERE id=$1',
    [first],
  );
  expect(rows[0]).toEqual({ password_hash: null, email_verified: true });
  await db.query(
    "INSERT INTO reader_accounts(id,username,name,email,password_hash,recovery_hash) VALUES('11111111-1111-4111-8111-111111111111','local_reader','Local reader','local.reader@example.com','test-placeholder','test-placeholder')",
  );
  const other = { ...profile, sub: 'google-local-reader', email: 'local.reader@example.com' };
  await expect(resolveGoogleAccount(db, other)).rejects.toThrow('LINK_REQUIRED');
  expect(await resolveGoogleAccount(db, other, '11111111-1111-4111-8111-111111111111')).toBe(
    '11111111-1111-4111-8111-111111111111',
  );
  await expect(
    resolveGoogleAccount(
      db,
      { ...other, sub: 'attacker-sub' },
      '11111111-1111-4111-8111-111111111111',
    ),
  ).rejects.toThrow('LINK_CONFLICT');
  await expect(
    resolveGoogleAccount(db, profile, '11111111-1111-4111-8111-111111111111'),
  ).rejects.toThrow('LINK_CONFLICT');
});
