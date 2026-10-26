import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Database } from '../../../packages/db/src/index.ts';
import type { ReaderIdentity } from './accounts.ts';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), {
  timeoutDuration: 5000,
});
function configuration() {
  const {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    AUTH_PUBLIC_ORIGIN: origin,
  } = process.env;
  if (!clientId || !clientSecret || !origin) return null;
  try {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      (url.protocol !== 'https:' &&
        !(process.env.NODE_ENV !== 'production' && url.hostname === '127.0.0.1'))
    )
      return null;
  } catch {
    return null;
  }
  return { clientId, clientSecret, origin, redirectUri: `${origin}/v1/account/google/callback` };
}
export const googleConfigured = () => Boolean(configuration());
const profileSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().toLowerCase().max(254),
  email_verified: z.literal(true),
  name: z.string().trim().min(1).max(80).optional(),
});
export type GoogleProfile = z.infer<typeof profileSchema>;
export async function verifyGoogleToken(
  token: string,
  clientId: string,
  nonce: string,
  resolver: JWTVerifyGetKey = keys,
): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(token, resolver, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
    algorithms: ['RS256'],
    maxTokenAge: '10 minutes',
    requiredClaims: ['sub', 'exp', 'iat', 'nonce', 'email', 'email_verified'],
  });
  if (payload.nonce !== nonce || (payload.azp && payload.azp !== clientId))
    throw new Error('Invalid Google identity');
  return profileSchema.parse(payload);
}
export async function resolveGoogleAccount(
  db: Database,
  profile: GoogleProfile,
  linkAccountId?: string,
) {
  return db.transaction(async (tx) => {
    const { rows: existing } = await tx.query<{
      id: string;
      email: string | null;
      google_sub: string | null;
    }>('SELECT id,email,google_sub FROM reader_accounts WHERE google_sub=$1 OR lower(email)=$2', [
      profile.sub,
      profile.email,
    ]);
    if (linkAccountId) {
      const { rows: owner } = await tx.query<{ email: string | null; google_sub: string | null }>(
        'SELECT email,google_sub FROM reader_accounts WHERE id=$1 FOR UPDATE',
        [linkAccountId],
      );
      if (
        !owner[0] ||
        (owner[0].email && owner[0].email !== profile.email) ||
        (owner[0].google_sub && owner[0].google_sub !== profile.sub) ||
        existing.some((row) => row.id !== linkAccountId)
      )
        throw new Error('LINK_CONFLICT');
      await tx.query(
        'UPDATE reader_accounts SET email=$1,email_verified=true,google_sub=$2 WHERE id=$3',
        [profile.email, profile.sub, linkAccountId],
      );
      return linkAccountId;
    }
    const bySubject = existing.find((row) => row.google_sub === profile.sub);
    if (bySubject) return bySubject.id;
    // A matching email is not proof of access to an existing local account.
    if (existing.length) throw new Error('LINK_REQUIRED');
    const id = randomUUID();
    await tx.query(
      'INSERT INTO reader_accounts(id,username,name,email,email_verified,google_sub) VALUES($1,$2,$3,$4,true,$5)',
      [
        id,
        `reader_${randomBytes(8).toString('hex')}`,
        profile.name ?? profile.email.split('@')[0],
        profile.email,
        profile.sub,
      ],
    );
    await tx.query('INSERT INTO reader_data(account_id) VALUES($1)', [id]);
    return id;
  });
}
export async function registerGoogle(
  app: FastifyInstance,
  db: Database,
  auth: {
    identity: (req: FastifyRequest) => Promise<ReaderIdentity | null>;
    session: (reply: FastifyReply, id: string) => Promise<void>;
    clearSession: (reply: FastifyReply) => void;
  },
) {
  const secure = process.env.NODE_ENV === 'production',
    cookieName = secure ? '__Host-scripture-oauth' : 'scripture-oauth';
  const cookie = (value: string, maxAge: number) =>
    `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  const failure = (reply: FastifyReply, reason: string) =>
    reply.redirect(`/account/signin?googleError=${reason}`);
  app.post(
    '/v1/account/google/start',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (req, reply) => {
      const config = configuration();
      if (!config)
        return reply
          .code(503)
          .send({
            error: {
              code: 'GOOGLE_NOT_CONFIGURED',
              message:
                'Google sign-in is not enabled yet. Use email or username and your website password.',
            },
          });
      const { purpose } = z
        .object({ purpose: z.enum(['signin', 'link', 'delete']).default('signin') })
        .parse(req.body ?? {});
      const user = purpose === 'signin' ? null : await auth.identity(req);
      if (purpose !== 'signin' && !user)
        return reply
          .code(401)
          .send({
            error: {
              code: 'SIGN_IN_REQUIRED',
              message: 'Sign in before changing your linked account.',
            },
          });
      const state = randomBytes(32).toString('hex'),
        browser = randomBytes(32).toString('hex'),
        verifier = randomBytes(32).toString('base64url'),
        nonce = randomBytes(32).toString('hex');
      await db.query('DELETE FROM reader_oauth_states WHERE expires_at<=now()');
      await db.query(
        "INSERT INTO reader_oauth_states VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')",
        [digest(state), digest(browser), verifier, nonce, purpose, user?.id ?? null],
      );
      reply.header('Set-Cookie', cookie(browser, 600));
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce,
        code_challenge: Buffer.from(digest(verifier), 'hex').toString('base64url'),
        code_challenge_method: 'S256',
        prompt: 'select_account',
      }).toString();
      return { url: url.href };
    },
  );
  app.get(
    '/v1/account/google/callback',
    { config: { rateLimit: { max: 20, timeWindow: '5 minutes' } } },
    async (req, reply) => {
      const config = configuration();
      if (!config) return failure(reply, 'unavailable');
      const query = z
        .object({
          state: z.string().regex(/^[a-f0-9]{64}$/),
          code: z.string().min(1).max(4096).optional(),
          error: z.string().max(200).optional(),
        })
        .safeParse(req.query);
      const browser = req.headers.cookie
        ?.split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1);
      if (!query.success || !browser || !/^[a-f0-9]{64}$/.test(browser))
        return failure(reply, 'state');
      const { rows } = await db.query<{
        verifier: string;
        nonce: string;
        purpose: 'signin' | 'link' | 'delete';
        account_id: string | null;
      }>(
        'DELETE FROM reader_oauth_states WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>now() RETURNING verifier,nonce,purpose,account_id',
        [digest(query.data.state), digest(browser)],
      );
      reply.header('Set-Cookie', cookie('', 0));
      if (!rows[0]) return failure(reply, 'state');
      const flow = rows[0];
      if (query.data.error || !query.data.code) return failure(reply, 'cancelled');
      try {
        if (flow.purpose !== 'signin' && (await auth.identity(req))?.id !== flow.account_id)
          return failure(reply, 'session');
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          signal: AbortSignal.timeout(10000),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: query.data.code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
            code_verifier: flow.verifier,
          }),
        });
        if (!response.ok) throw new Error('TOKEN_EXCHANGE');
        const { id_token } = z
          .object({ id_token: z.string().max(12000) })
          .parse(await response.json());
        const profile = await verifyGoogleToken(id_token, config.clientId, flow.nonce);
        if (flow.purpose === 'delete') {
          const { rows: owner } = await db.query<{ id: string }>(
            'SELECT id FROM reader_accounts WHERE id=$1 AND google_sub=$2',
            [flow.account_id, profile.sub],
          );
          if (!owner[0]) return failure(reply, 'identity');
          await db.query('DELETE FROM reader_accounts WHERE id=$1', [owner[0].id]);
          auth.clearSession(reply);
          return reply.redirect('/account/signin?deleted=1');
        }
        const id = await resolveGoogleAccount(
          db,
          profile,
          flow.purpose === 'link' ? flow.account_id! : undefined,
        );
        await auth.session(reply, id);
        return reply.redirect('/study');
      } catch (err) {
        return failure(
          reply,
          err instanceof Error && err.message === 'LINK_REQUIRED'
            ? 'link_required'
            : err instanceof Error && err.message === 'LINK_CONFLICT'
              ? 'link_conflict'
              : 'callback',
        );
      }
    },
  );
}
