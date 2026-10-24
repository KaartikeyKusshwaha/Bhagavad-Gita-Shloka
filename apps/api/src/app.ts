import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import { z } from 'zod';
import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import type { Database } from '../../../packages/db/src/index.ts';
import {
  getWorks,
  getTraditions,
  getDivisions,
  getPassage,
  getContext,
  getRelated,
  getChapter,
  getSourceList,
  getPassageById,
  getReadingSlice,
} from '../../../packages/db/src/queries.ts';
import { searchPassages } from '../../../packages/search/src/index.ts';
import { passageConnections } from '../../../packages/search/src/connections.ts';
import { browseTheme } from '../../../packages/search/src/themes.ts';
import { readingThemes } from '../../../packages/shared/src/themes.ts';
import { verifyClaim } from '../../../packages/verify/src/index.ts';
import { normalize } from '../../../packages/shared/src/index.ts';
import { routeSafety } from '../../../packages/llm/src/guardrails.ts';
const error = (code: string, message: string) => ({ error: { code, message } });
const claimBody = z.object({
  claim: z.string().trim().min(2).max(5000),
  claimed_source: z.string().max(100).optional(),
  lang: z.enum(['en', 'hi']).default('en'),
});
const reportBody = z.object({
  passage_id: z.string().max(150),
  kind: z.enum(['error', 'license', 'bias']),
  message: z.string().trim().min(10).max(3000),
});
const searchQuery = z.object({
  q: z.string().trim().min(2).max(500),
  mode: z.enum(['all', 'exact', 'fuzzy', 'semantic']).default('all'),
  work: z.string().max(100).optional(),
  tradition: z.string().max(50).optional(),
  lang: z.string().max(10).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export async function createApp(db: Database, options: { web?: boolean } = {}) {
  const app = Fastify({
    logger: false,
    bodyLimit: 64 * 1024,
    trustProxy: process.env.RENDER ? (_address: string, hop: number) => hop < 1 : false,
  });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-eval'"] : []),
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
  });
  await app.register(rateLimit, {
    max: 60,
    timeWindow: '1 minute',
    errorResponseBuilder: () => error('RATE_LIMITED', 'Please wait before trying again.'),
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Open Scripture API',
        version: '0.1.0',
        description: 'Approved, attributed texts. No account required to read.',
      },
    },
  });
  app.setErrorHandler<Error & { validation?: unknown; statusCode?: number }>((err, _req, reply) => {
    if (err instanceof z.ZodError || err.validation)
      return reply.code(400).send(error('INVALID_INPUT', 'Check the request fields and limits.'));
    if (err.message === 'SEMANTIC_UNAVAILABLE')
      return reply
        .code(503)
        .send(
          error(
            'SEMANTIC_UNAVAILABLE',
            'Semantic search is not enabled. Use exact or fuzzy search.',
          ),
        );
    if (err.statusCode === 413)
      return reply.code(413).send(error('BODY_TOO_LARGE', 'Request exceeds the 64 KB limit.'));
    return reply
      .code(err.statusCode ?? 500)
      .send(error('REQUEST_FAILED', 'The request could not be completed.'));
  });
  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('Referrer-Policy', 'no-referrer');
    if (req.url.startsWith('/v1/') && req.method === 'GET' && !req.url.startsWith('/v1/admin'))
      reply.header(
        'Cache-Control',
        req.url.includes('/health') ? 'no-store' : 'public, max-age=60, stale-while-revalidate=300',
      );
    else reply.header('Cache-Control', 'no-store');
    return payload;
  });
  app.get('/v1/health', async () => {
    await db.query('SELECT 1');
    const works = await getWorks(db);
    return {
      version: '0.1.0',
      data_version: '2026-10-24',
      database: 'connected',
      passages: works.reduce((n, w) => n + Number(w.passage_count), 0),
      capabilities: {
        exact: true,
        fuzzy: true,
        semantic: false,
        voice: false,
        ai_explanations: false,
      },
    };
  });
  app.get('/v1/traditions', async () => ({ traditions: await getTraditions(db) }));
  app.get('/v1/works', async (req) => {
    const q = z.object({ tradition: z.string().optional() }).parse(req.query);
    return { works: await getWorks(db, q.tradition) };
  });
  app.get('/v1/themes', async () => ({
    themes: readingThemes.map(({ slug, name }) => ({ slug, name })),
  }));
  app.get<{ Params: { slug: string } }>('/v1/themes/:slug', async (req, reply) => {
    const q = z.object({ work: z.string().max(100).optional() }).parse(req.query);
    const result = await browseTheme(db, req.params.slug, q.work);
    return result ?? reply.code(404).send(error('NOT_FOUND', 'No reading theme at that address.'));
  });
  app.get<{ Params: { work: string; ref: string } }>(
    '/v1/passages/:work/:ref/connections',
    async (req, reply) => {
      const p = await getPassage(db, req.params.work, req.params.ref);
      return p
        ? passageConnections(db, p)
        : reply.code(404).send(error('NOT_FOUND', 'No published passage at that address.'));
    },
  );
  app.get<{ Params: { slug: string } }>('/v1/works/:slug/reading', async (req, reply) => {
    const q = z
      .object({
        after: z.coerce.number().int().min(0).default(0),
        limit: z.coerce.number().int().min(1).max(20).default(5),
      })
      .parse(req.query);
    const passages = await getReadingSlice(db, req.params.slug, q.after, q.limit);
    return passages.length
      ? { passages }
      : reply.code(404).send(error('NOT_FOUND', 'No published passages at this reading position.'));
  });
  app.get<{ Params: { slug: string } }>('/v1/works/:slug/divisions', async (req, reply) => {
    const divisions = await getDivisions(db, req.params.slug);
    return divisions.length
      ? { divisions }
      : reply.code(404).send(error('NOT_FOUND', 'No published work at that address.'));
  });
  app.get<{ Params: { slug: string; number: string } }>(
    '/v1/works/:slug/chapters/:number',
    async (req, reply) => {
      const number = z.coerce.number().int().min(1).max(2000).parse(req.params.number);
      const passages = await getChapter(db, req.params.slug, number);
      return passages.length
        ? { passages }
        : reply.code(404).send(error('NOT_FOUND', 'No published chapter at that address.'));
    },
  );
  for (const suffix of ['', '/context', '/related'])
    app.get<{ Params: { work: string; ref: string } }>(
      `/v1/passages/:work/:ref${suffix}`,
      async (req, reply) => {
        const passage = await getPassage(db, req.params.work, req.params.ref);
        if (!passage)
          return reply.code(404).send(error('NOT_FOUND', 'No published passage at that address.'));
        if (suffix === '/context') {
          const q = z
            .object({
              before: z.coerce.number().int().min(0).max(10).default(5),
              after: z.coerce.number().int().min(0).max(10).default(5),
            })
            .parse(req.query);
          return getContext(db, passage, q.before, q.after);
        }
        if (suffix === '/related') return { passages: await getRelated(db, passage) };
        const q = z
          .object({ lang: z.string().optional(), translations: z.string().optional() })
          .parse(req.query);
        return {
          passage: {
            ...passage,
            translations: passage.translations.filter(
              (t) =>
                (!q.lang || q.lang === t.lang) &&
                (!q.translations || q.translations.split(',').includes(t.source.id)),
            ),
          },
        };
      },
    );
  app.get(
    '/v1/search',
    { schema: { querystring: z.toJSONSchema(searchQuery, { target: 'draft-7' }) } },
    async (req) => {
      const q = searchQuery.parse(req.query);
      const safety = routeSafety(q.q);
      return safety.kind === 'ordinary'
        ? {
            hits: await searchPassages(db, q.q, q),
            modes: ['exact', 'fuzzy'],
            semantic_enabled: false,
          }
        : { hits: [], safety };
    },
  );
  const daily = new Map<string, { count: number; day: string }>();
  async function consumeDaily(ip: string) {
    const day = new Date().toISOString().slice(0, 10),
      key = createHash('sha256')
        .update(`${process.env.RATE_LIMIT_SECRET ?? 'local-only'}:${day}:${ip}`)
        .digest('hex');
    if (process.env.NODE_ENV === 'production') {
      const result = await db.query(
        `INSERT INTO daily_usage(key,day,count) VALUES($1,$2,1) ON CONFLICT(key,day) DO UPDATE SET count=daily_usage.count+1 WHERE daily_usage.count<600 RETURNING count`,
        [key, day],
      );
      return result.rows.length > 0;
    }
    for (const [key, entry] of daily) if (entry.day !== day) daily.delete(key);
    const state = daily.get(key) ?? { day, count: 0 };
    state.count++;
    daily.set(key, state);
    return state.count <= 600;
  }
  app.post(
    '/v1/verify',
    { schema: { body: z.toJSONSchema(claimBody, { target: 'draft-7' }) } },
    async (req, reply) => {
      const q = claimBody.parse(req.body);
      if (!(await consumeDaily(req.ip)))
        return reply
          .code(429)
          .send(error('DAILY_LIMIT', 'Verification is limited to 600 requests per day.'));
      const result = await verifyClaim(db, q.claim, q.claimed_source);
      if ('verdict' in result)
        await db.query('INSERT INTO verify_logs(id,claim_hash,verdict,lang) VALUES($1,$2,$3,$4)', [
          randomUUID(),
          createHash('sha256').update(q.claim).digest('hex'),
          result.verdict,
          q.lang,
        ]);
      return result;
    },
  );
  app.post('/v1/ask', async (req, reply) => {
    const q = z
      .object({
        question: z.string().trim().min(3).max(3000),
        traditions: z.array(z.string()).max(14).optional(),
        lang: z.string().default('en'),
      })
      .parse(req.body);
    if (!(await consumeDaily(req.ip)))
      return reply.code(429).send(error('DAILY_LIMIT', 'Daily request limit reached.'));
    const safety = routeSafety(q.question);
    if (safety.kind !== 'ordinary') return { safety, passages: [] };
    return {
      passages: await searchPassages(db, q.question, {
        limit: 5,
        tradition: q.traditions?.length === 1 ? q.traditions[0] : undefined,
      }),
      answer: null,
      note: 'Relevant passages for study. A generative answer is not enabled; a text match is not a religious ruling.',
    };
  });
  app.get('/v1/sources', async () => ({ sources: await getSourceList(db) }));
  app.post(
    '/v1/reports',
    { schema: { body: z.toJSONSchema(reportBody, { target: 'draft-7' }) } },
    async (req, reply) => {
      const q = reportBody.parse(req.body);
      if (!(await getPassageById(db, q.passage_id)))
        return reply
          .code(404)
          .send(error('NOT_FOUND', 'Passage is not in the published collection.'));
      const id = randomUUID();
      await db.query('INSERT INTO reports(id,passage_id,kind,message) VALUES($1,$2,$3,$4)', [
        id,
        q.passage_id,
        q.kind,
        q.message,
      ]);
      return reply.code(201).send({ id, status: 'open' });
    },
  );
  app.get('/v1/corrections', async () => ({
    corrections: (await db.query('SELECT * FROM corrections ORDER BY date DESC LIMIT 100')).rows,
  }));
  app.get('/v1/misquotes', async () => ({
    misquotes: (await db.query('SELECT * FROM published_misquotes ORDER BY id LIMIT 100')).rows,
  }));
  app.get('/v1/scholars', async () => ({
    reviewers: (
      await db.query(
        'SELECT r.id,r.name,r.school,t.slug AS tradition FROM reviewers r JOIN traditions t ON t.id=r.tradition_id WHERE r.active ORDER BY t.name,r.name',
      )
    ).rows,
  }));
  app.post('/v1/scholar-questions', async (req, reply) => {
    const q = z
      .object({ question: z.string().trim().min(10).max(3000), tradition: z.string().max(50) })
      .parse(req.body);
    const reviewer = (
      await db.query('SELECT id FROM reviewers WHERE tradition_id=$1 AND active LIMIT 1', [
        q.tradition,
      ])
    ).rows[0];
    if (!reviewer)
      return reply
        .code(409)
        .send(
          error(
            'NO_REVIEWER',
            'No named reviewer is available for this tradition yet. The question has not been submitted.',
          ),
        );
    const id = randomUUID();
    await db.query(
      'INSERT INTO scholar_questions(id,tradition_id,question,reviewer_id) VALUES($1,$2,$3,$4)',
      [id, q.tradition, q.question, reviewer.id],
    );
    return reply.code(201).send({ id, status: 'queued' });
  });
  app.get('/v1/speech/tts', async (req, reply) => {
    const q = z.object({ passage_id: z.string(), lang: z.string().optional() }).parse(req.query);
    const audio = (
      await db.query(
        'SELECT * FROM published_audio WHERE passage_id=$1 AND ($2::text IS NULL OR lang=$2) LIMIT 1',
        [q.passage_id, q.lang ?? null],
      )
    ).rows[0];
    return (
      audio ??
      reply.code(404).send(error('NO_RECITATION', 'No licensed human recitation is available.'))
    );
  });
  app.post('/v1/speech/stt', async (_req, reply) =>
    reply
      .code(503)
      .send(
        error(
          'SPEECH_UNAVAILABLE',
          'Voice transcription awaits a configured provider and language review. No audio is retained.',
        ),
      ),
  );
  app.post('/v1/translate', async (req, reply) => {
    const q = z
      .object({ text: z.string().max(5000), from: z.string(), to: z.string(), kind: z.string() })
      .parse(req.body);
    return q.kind !== 'explanation'
      ? reply
          .code(400)
          .send(
            error(
              'SCRIPTURE_TRANSLATION_REFUSED',
              'Only explanation text can be machine translated.',
            ),
          )
      : reply
          .code(503)
          .send(
            error(
              'TRANSLATION_UNAVAILABLE',
              'No reviewed explanation translation provider is configured.',
            ),
          );
  });
  app.delete('/v1/me/data', async () => ({
    deleted: 0,
    note: 'No accounts, transcripts, or audio are stored. Anonymous reports and public contributions are not linked to a personal profile.',
  }));
  const isAdmin = (auth?: string) => {
    const token = process.env.ADMIN_TOKEN;
    if (!token || !auth) return false;
    const a = Buffer.from(auth),
      b = Buffer.from(`Bearer ${token}`);
    return a.length === b.length && timingSafeEqual(a, b);
  };
  app.addHook('preHandler', async (req, reply) => {
    if (req.url.startsWith('/v1/admin/') && !isAdmin(req.headers.authorization))
      return reply.code(401).send(error('UNAUTHORIZED', 'Reviewer authorization required.'));
  });
  app.get('/v1/admin/reports', async () => ({
    reports: (
      await db.query(
        'SELECT r.*,p.ref,w.slug AS work FROM reports r JOIN passages p ON p.id=r.passage_id JOIN works w ON w.id=p.work_id ORDER BY r.created_at DESC LIMIT 100',
      )
    ).rows,
  }));
  app.get('/v1/admin/stats', async () => ({
    counts: (
      await db.query(
        "SELECT (SELECT count(*) FROM published_passages)::int AS passages,(SELECT count(*) FROM reports WHERE status='open')::int AS open_reports,(SELECT count(*) FROM verify_logs)::int AS verifications",
      )
    ).rows[0],
  }));
  app.post('/v1/admin/corrections', async (req, reply) => {
    const q = z
      .object({
        report_id: z.string().uuid(),
        reviewer_id: z.string().max(100),
        field: z.enum(['original_text', 'translation_text']),
        translation_id: z.string().optional(),
        replacement: z.string().trim().min(1).max(12000),
      })
      .parse(req.body);
    const reviewer = (
      await db.query('SELECT * FROM reviewers WHERE id=$1 AND active', [q.reviewer_id])
    ).rows[0];
    if (!reviewer)
      return reply
        .code(409)
        .send(error('REVIEWER_REQUIRED', 'A named, active reviewer is required.'));
    return db.transaction(async (tx) => {
      const report = (
        await tx.query(
          "SELECT r.*,w.tradition_id FROM reports r JOIN passages p ON p.id=r.passage_id JOIN works w ON w.id=p.work_id WHERE r.id=$1 AND r.status='open' FOR UPDATE OF r",
          [q.report_id],
        )
      ).rows[0];
      if (!report || report.tradition_id !== reviewer.tradition_id)
        return reply
          .code(409)
          .send(
            error(
              'REVIEW_REQUIRED',
              'Report is closed, missing, or outside the reviewer’s tradition.',
            ),
          );
      const before = (
        await tx.query(
          q.field === 'original_text'
            ? 'SELECT original_text AS text FROM passages WHERE id=$1'
            : 'SELECT text FROM translations WHERE passage_id=$1 AND id=$2',
          q.field === 'original_text' ? [report.passage_id] : [report.passage_id, q.translation_id],
        )
      ).rows[0];
      if (!before)
        return reply.code(400).send(error('INVALID_CORRECTION', 'Choose an existing text layer.'));
      const text = q.replacement.normalize('NFC');
      if (q.field === 'original_text')
        await tx.query('UPDATE passages SET original_text=$1,text_norm=$2 WHERE id=$3', [
          text,
          normalize(text),
          report.passage_id,
        ]);
      else
        await tx.query(
          'UPDATE translations SET text=$1,text_norm=$2 WHERE id=$3 AND passage_id=$4',
          [text, normalize(text), q.translation_id, report.passage_id],
        );
      const id = randomUUID();
      await tx.query(
        'INSERT INTO corrections(id,passage_id,report_id,before,after,approved_by) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6)',
        [
          id,
          report.passage_id,
          q.report_id,
          JSON.stringify({ field: q.field, text: before.text }),
          JSON.stringify({ field: q.field, text }),
          reviewer.name,
        ],
      );
      await tx.query("UPDATE reports SET status='corrected' WHERE id=$1", [q.report_id]);
      return reply.code(201).send({ id, status: 'published' });
    });
  });
  app.get('/openapi.json', async () => app.swagger());
  if (!options.web)
    app.setNotFoundHandler((_req, reply) =>
      reply.code(404).send(error('NOT_FOUND', 'No endpoint at this address.')),
    );
  return app;
}
