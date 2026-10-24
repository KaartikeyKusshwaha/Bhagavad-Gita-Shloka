import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import type { Database } from '../../db/src/index.ts';
import { normalize, traditionRegistry } from '../../shared/src/index.ts';
import { licenseGate } from './licenseGate.ts';
interface GitaRecord {
  id: string;
  ref: string;
  chapter: number;
  verse: number;
  ordinal: number;
  original_text: string;
  transliteration: string;
  translations: {
    lang: string;
    translator: string;
    text: string;
    source_id: string;
    source_ref: string;
  }[];
}
export async function ingestGita(db: Database) {
  return db.transaction(ingestGitaTransaction);
}
async function ingestGitaTransaction(db: Database) {
  const bytes = await readFile(
    fileURLToPath(new URL('../../../data/imports/gita.json', import.meta.url)),
  );
  const data = JSON.parse(bytes.toString()) as { passages: GitaRecord[] };
  const checksum = createHash('sha256').update(bytes).digest('hex');
  if (data.passages.length !== 700) throw new Error('Expected exactly 700 Gita passages');
  for (const [slug, name] of traditionRegistry)
    await db.query(
      'INSERT INTO traditions(id,slug,name) VALUES($1,$1,$2) ON CONFLICT(id) DO NOTHING',
      [slug, name],
    );
  for (const name of ['gita-sanskrit', 'besant-1922']) {
    const record = parse(
      await readFile(
        fileURLToPath(new URL(`../../../data/sources/${name}.yml`, import.meta.url)),
        'utf8',
      ),
    );
    const source = licenseGate(record);
    if (source.checksum !== checksum) throw new Error(`Checksum mismatch: ${name}`);
    await db.query(
      `INSERT INTO sources(id,tradition_id,name,url,license,license_url,commercial_ok,attribution,retrieved_at,checksum,version,status,display_rules) VALUES($1,'hinduism',$2,$3,$4,$5,$6,$7,$8,$9,'2026-10-24',$10,$11::jsonb) ON CONFLICT(id) DO NOTHING`,
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
  }
  await db.query(
    "INSERT INTO works VALUES('bhagavad-gita','hinduism','bhagavad-gita','Bhagavad Gita','sa',1) ON CONFLICT(id) DO NOTHING",
  );
  const chapters = JSON.parse(
    await readFile(
      fileURLToPath(new URL('../../../data/imports/chapters.json', import.meta.url)),
      'utf8',
    ),
  ) as { number: number; title: string }[];
  for (const chapter of chapters)
    await db.query(
      "INSERT INTO divisions(id,work_id,kind,number,title) VALUES($1,'bhagavad-gita','chapter',$2,$3) ON CONFLICT(id) DO NOTHING",
      [`bg.${chapter.number}`, chapter.number, chapter.title],
    );
  for (const p of data.passages) {
    await db.query(
      `INSERT INTO passages(id,work_id,division_id,source_id,ref,ordinal,verse_number,original_text,text_norm,original_script,transliteration,transliteration_norm) VALUES($1,'bhagavad-gita',$2,'gita-sanskrit',$3,$4,$5,$6,$7,'Devanagari',$8,$9) ON CONFLICT(id) DO NOTHING`,
      [
        p.id,
        `bg.${p.chapter}`,
        p.ref,
        p.ordinal,
        p.verse,
        p.original_text.normalize('NFC'),
        normalize(p.original_text),
        p.transliteration.normalize('NFC'),
        normalize(p.transliteration),
      ],
    );
    for (const t of p.translations)
      await db.query(
        `INSERT INTO translations(id,passage_id,source_id,lang,translator,text,text_norm,is_machine,source_ref) VALUES($1,$2,$3,$4,$5,$6,$7,false,$8) ON CONFLICT(id) DO NOTHING`,
        [
          `${p.id}.${t.source_id}.${t.lang}`,
          p.id,
          t.source_id,
          t.lang,
          t.translator,
          t.text.normalize('NFC'),
          normalize(t.text),
          t.source_ref,
        ],
      );
  }
  return { passages: data.passages.length, checksum };
}
export async function publishSource(db: Database, id: string) {
  const source = (await db.query('SELECT * FROM sources WHERE id=$1', [id])).rows[0];
  licenseGate(source);
  await db.query("UPDATE sources SET status='approved' WHERE id=$1", [id]);
}
