import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { z } from 'zod';
import type { Database } from '../../db/src/index.ts';
import { licenseGate } from './licenseGate.ts';
const schema = z.object({
  tracks: z.array(
    z.object({
      id: z.string(),
      passage_id: z.string(),
      source_id: z.string(),
      reciter: z.string(),
      lang: z.string(),
      url: z.url().startsWith('https://upload.wikimedia.org/'),
      duration_ms: z.number().int().positive(),
      license: z.string(),
      is_human: z.literal(true),
      scope: z.string(),
      upstream_sha1: z.string().regex(/^[a-f0-9]{40}$/),
    }),
  ),
});
export async function ingestAudio(db: Database) {
  const bytes = await readFile(new URL('../../../data/imports/recitations.json', import.meta.url));
  const data = schema.parse(JSON.parse(bytes.toString('utf8'))),
    checksum = createHash('sha256').update(bytes).digest('hex');
  return db.transaction(async (tx) => {
    for (const track of data.tracks) {
      const s = licenseGate(
        parse(
          await readFile(
            new URL(`../../../data/sources/${track.source_id}.yml`, import.meta.url),
            'utf8',
          ),
        ),
      );
      if (
        s.id !== track.source_id ||
        s.checksum !== checksum ||
        s.license !== track.license ||
        s.display_rules.scope !== track.scope
      )
        throw new Error('Audio source record mismatch');
      await tx.query(
        `INSERT INTO sources(id,tradition_id,name,url,license,license_url,commercial_ok,attribution,retrieved_at,checksum,version,status,display_rules)
        VALUES($1,'islam',$2,$3,$4,$5,$6,$7,$8,$9,'1',$10,$11::jsonb) ON CONFLICT(id) DO NOTHING`,
        [
          s.id,
          s.name,
          s.url,
          s.license,
          s.license_url,
          s.commercial_ok,
          s.attribution,
          s.retrieved_at,
          s.checksum,
          s.status,
          JSON.stringify(s.display_rules),
        ],
      );
      await tx.query(
        `INSERT INTO audio(id,passage_id,source_id,reciter,lang,url,duration_ms,license,is_human)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT(id) DO NOTHING`,
        [
          track.id,
          track.passage_id,
          track.source_id,
          track.reciter,
          track.lang,
          track.url,
          track.duration_ms,
          track.license,
        ],
      );
    }
    return { human_recordings: data.tracks.length };
  });
}
