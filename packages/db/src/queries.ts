import type { Database } from './index.ts';
import type { Passage, Source, Translation } from '../../shared/src/index.ts';
const passageSelect = `SELECT p.*,w.slug AS work,w.title AS work_title,t.slug AS tradition,t.name AS tradition_name,d.number AS chapter,to_jsonb(s) AS source FROM published_passages p JOIN works w ON w.id=p.work_id JOIN traditions t ON t.id=w.tradition_id JOIN divisions d ON d.id=p.division_id JOIN sources s ON s.id=p.source_id`;
export async function hydrate(db: Database, rows: Record<string, unknown>[]): Promise<Passage[]> {
  if (!rows.length) return [];
  const translations = (
    await db.query(
      `SELECT tr.*,to_jsonb(s) AS source FROM published_translations tr JOIN sources s ON s.id=tr.source_id WHERE tr.passage_id=ANY($1::text[]) ORDER BY tr.lang,tr.translator`,
      [rows.map((x) => x.id)],
    )
  ).rows;
  return rows.map(
    (r) =>
      ({
        ...r,
        source: r.source as Source,
        translations: translations.filter((t) => t.passage_id === r.id) as Translation[],
      }) as Passage,
  );
}
export async function getPassage(db: Database, work: string, ref: string) {
  const canonical = ref.replace(/-/g, ' ');
  return (
    (
      await hydrate(
        db,
        (
          await db.query(`${passageSelect} WHERE w.slug=$1 AND (p.ref=$2 OR p.id=$2)`, [
            work,
            canonical,
          ])
        ).rows,
      )
    )[0] ?? null
  );
}
export async function getPassageById(db: Database, id: string) {
  return (
    (await hydrate(db, (await db.query(`${passageSelect} WHERE p.id=$1`, [id])).rows))[0] ?? null
  );
}
export async function getContext(db: Database, p: Passage, before = 5, after = 5) {
  const rows = (
    await db.query(
      `${passageSelect} WHERE w.slug=$1 AND p.ordinal BETWEEN $2 AND $3 ORDER BY p.ordinal`,
      [p.work, p.ordinal - before, p.ordinal + after],
    )
  ).rows;
  const passages = await hydrate(db, rows);
  const division = (
    await db.query('SELECT title,summary FROM divisions WHERE id=$1', [p.division_id])
  ).rows[0];
  return {
    before: passages.filter((x) => x.ordinal < p.ordinal),
    after: passages.filter((x) => x.ordinal > p.ordinal),
    division,
  };
}
export async function getWorks(db: Database, tradition?: string) {
  return (
    await db.query(
      `SELECT w.*,t.slug AS tradition,t.name AS tradition_name,t.board_status,count(p.id)::int AS passage_count FROM works w JOIN traditions t ON t.id=w.tradition_id JOIN published_passages p ON p.work_id=w.id WHERE ($1::text IS NULL OR t.slug=$1) GROUP BY w.id,t.slug,t.name,t.board_status ORDER BY t.name,w.canon_order,w.title`,
      [tradition ?? null],
    )
  ).rows;
}
export async function getDivisions(db: Database, work: string) {
  return (
    await db.query(
      `SELECT d.*,count(p.id)::int AS verse_count FROM divisions d JOIN works w ON w.id=d.work_id JOIN published_passages p ON p.division_id=d.id WHERE w.slug=$1 GROUP BY d.id ORDER BY d.number`,
      [work],
    )
  ).rows;
}
export async function getChapter(db: Database, work: string, number: number) {
  return hydrate(
    db,
    (
      await db.query(`${passageSelect} WHERE w.slug=$1 AND d.number=$2 ORDER BY p.ordinal`, [
        work,
        number,
      ])
    ).rows,
  );
}
export async function getTraditions(db: Database) {
  return (
    await db.query(
      `SELECT t.*,count(DISTINCT w.id)::int AS work_count,count(p.id)::int AS passage_count FROM traditions t LEFT JOIN works w ON w.tradition_id=t.id LEFT JOIN published_passages p ON p.work_id=w.id GROUP BY t.id ORDER BY t.name`,
    )
  ).rows;
}
export async function getRelated(db: Database, p: Passage) {
  return hydrate(
    db,
    (
      await db.query(
        `${passageSelect} WHERE p.id IN (SELECT x.to_passage_id FROM xrefs x JOIN sources xs ON xs.id=x.source_id WHERE x.from_passage_id=$1 AND xs.status='approved') ORDER BY p.ordinal LIMIT 12`,
        [p.id],
      )
    ).rows,
  );
}
export async function getSourceList(db: Database) {
  return (
    await db.query(
      `SELECT s.*,count(DISTINCT p.id)::int AS passage_count FROM sources s LEFT JOIN published_passages p ON p.source_id=s.id OR EXISTS(SELECT 1 FROM published_translations tr WHERE tr.passage_id=p.id AND tr.source_id=s.id) GROUP BY s.id ORDER BY s.name`,
    )
  ).rows;
}
