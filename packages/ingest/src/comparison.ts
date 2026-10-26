import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { Database } from '../../db/src/index.ts';
import { normalize } from '../../shared/src/index.ts';
import { licenseGate } from './licenseGate.ts';

export async function ingestGitaComparison(db: Database) {
  const bytes = await readFile(
    fileURLToPath(new URL('../../../data/imports/gita-comparison.json', import.meta.url)),
  );
  const data = JSON.parse(bytes.toString()) as {
    translations: {
      passage_id: string;
      source_id: string;
      lang: string;
      translator: string;
      text: string;
      source_ref: string;
    }[];
  };
  const source = licenseGate(
    parse(
      await readFile(
        fileURLToPath(new URL('../../../data/sources/swarupananda-1909.yml', import.meta.url)),
        'utf8',
      ),
    ),
  );
  if (source.checksum !== createHash('sha256').update(bytes).digest('hex'))
    throw new Error('Comparison checksum mismatch');
  if (
    data.translations.length !== 700 ||
    new Set(data.translations.map((t) => t.passage_id)).size !== 700
  )
    throw new Error('Expected 700 comparison verse mappings');
  return db.transaction(async (tx) => {
    await tx.query(
      `INSERT INTO sources(id,tradition_id,name,url,license,license_url,commercial_ok,attribution,retrieved_at,checksum,version,status,display_rules)
      VALUES($1,'hinduism',$2,$3,$4,$5,$6,$7,$8,$9,'1909-import-2026-10-25',$10,$11::jsonb) ON CONFLICT(id) DO NOTHING`,
      [
        source.id,
        source.name,
        source.url,
        source.license,
        source.license_url,
        source.commercial_ok,
        source.attribution,
        source.retrieved_at,
        source.checksum,
        source.status,
        JSON.stringify(source.display_rules),
      ],
    );
    for (const t of data.translations) {
      if (!/^bg\.\d+\.\d+$/.test(t.passage_id) || t.source_id !== source.id || !t.text.trim())
        throw new Error('Invalid comparison mapping');
      await tx.query(
        `INSERT INTO translations(id,passage_id,source_id,lang,translator,text,text_norm,is_machine,source_ref)
        VALUES($1,$2,$3,$4,$5,$6,$7,false,$8) ON CONFLICT(id) DO NOTHING`,
        [
          `${t.passage_id}.${source.id}.${t.lang}`,
          t.passage_id,
          source.id,
          t.lang,
          t.translator,
          t.text.normalize('NFC'),
          normalize(t.text),
          t.source_ref,
        ],
      );
    }
    return { comparison_mappings: data.translations.length };
  });
}
