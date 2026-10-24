import type { Database } from '../../db/src/index.ts';
import { getContext, getPassageById } from '../../db/src/queries.ts';
import { normalize, type Passage } from '../../shared/src/index.ts';
export interface ConnectionEdge {
  from: string;
  to: string;
  kind: 'source_sequence' | 'cross_reference' | 'suggested';
  label: string;
  basis: { name: string; url: string };
}
export interface Connections {
  nodes: Passage[];
  edges: ConnectionEdge[];
}
const stop = new Set(
  'about after again also amid among before being could does from have into just more most must never only other over shall should some such than that thee their them then there these they this those thou through thus unto upon very what when where which while will with would your hath thou thee thine thy dost doth himself herself itself'.split(
    ' ',
  ),
);
export async function passageConnections(db: Database, p: Passage): Promise<Connections> {
  const context = await getContext(db, p, 1, 1),
    nodes = [p],
    edges: ConnectionEdge[] = [];
  function add(
    target: Passage,
    kind: ConnectionEdge['kind'],
    label: string,
    basis: ConnectionEdge['basis'],
  ) {
    if (!nodes.some((n) => n.id === target.id)) nodes.push(target);
    edges.push({ from: p.id, to: target.id, kind, label, basis });
  }
  for (const neighbor of [...context.before, ...context.after])
    add(neighbor, 'source_sequence', 'Adjacent in this edition', {
      name: p.source.name,
      url: p.source.url,
    });
  const refs = (
    await db.query(
      `SELECT x.to_passage_id,x.kind,s.name,s.url FROM xrefs x JOIN sources s ON s.id=x.source_id WHERE x.from_passage_id=$1 AND s.status='approved' ORDER BY x.to_passage_id LIMIT 2`,
      [p.id],
    )
  ).rows;
  for (const ref of refs) {
    const target = await getPassageById(db, String(ref.to_passage_id));
    if (target)
      add(target, 'cross_reference', String(ref.kind), {
        name: String(ref.name),
        url: String(ref.url),
      });
  }
  const text = p.translations.find((t) => t.lang === 'en')?.text ?? p.original_text;
  const words = Array.from(
    new Set(
      normalize(text)
        .split(' ')
        .filter((w) => w.length >= 4 && !stop.has(w)),
    ),
  )
    .sort((a, b) => b.length - a.length)
    .slice(0, 8);
  if (words.length) {
    const related = (
      await db.query(
        `WITH scored AS MATERIALIZED (SELECT p.id,p.ordinal,ARRAY(SELECT token FROM unnest($2::text[]) token WHERE
      (' '||p.text_norm||' ') LIKE ('% '||token||' %') OR (' '||p.transliteration_norm||' ') LIKE ('% '||token||' %') OR
      EXISTS(SELECT 1 FROM published_translations tr WHERE tr.passage_id=p.id AND (' '||tr.text_norm||' ') LIKE ('% '||token||' %'))) AS shared
      FROM published_passages p WHERE NOT(p.id=ANY($1::text[])))
      SELECT * FROM scored WHERE cardinality(shared)>0 ORDER BY cardinality(shared) DESC,ordinal LIMIT 2`,
        [nodes.map((n) => n.id), words],
      )
    ).rows;
    for (const candidate of related) {
      const shared = candidate.shared as string[];
      if (!shared.length) continue;
      const target = await getPassageById(db, String(candidate.id));
      if (target)
        add(target, 'suggested', `Shared wording: ${shared.slice(0, 3).join(', ')}`, {
          name: 'Automatic wording comparison',
          url: '/about',
        });
    }
  }
  return { nodes, edges };
}
