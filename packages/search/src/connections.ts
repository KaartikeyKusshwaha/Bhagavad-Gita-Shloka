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
        `WITH documents AS MATERIALIZED (
          SELECT p.id,p.ordinal,p.text_norm AS text FROM published_passages p WHERE to_tsvector('simple',p.text_norm) @@ to_tsquery('simple',$3)
          UNION ALL
          SELECT p.id,p.ordinal,p.transliteration_norm FROM published_passages p WHERE p.transliteration_norm<>'' AND to_tsvector('simple',p.transliteration_norm) @@ to_tsquery('simple',$3)
          UNION ALL
          SELECT p.id,p.ordinal,tr.text_norm FROM published_translations tr JOIN published_passages p ON p.id=tr.passage_id WHERE (tr.lang='en' AND to_tsvector('english',tr.text_norm) @@ to_tsquery('english',$3)) OR (tr.lang='hi' AND to_tsvector('simple',tr.text_norm) @@ to_tsquery('simple',$3))
        )
        SELECT id,ordinal,array_agg(DISTINCT token ORDER BY token) AS shared
        FROM documents CROSS JOIN unnest($2::text[]) words(token)
        WHERE NOT(id=ANY($1::text[])) AND (' '||text||' ') LIKE ('% '||token||' %')
        GROUP BY id,ordinal ORDER BY count(DISTINCT token) DESC,ordinal LIMIT 2`,
        [nodes.map((n) => n.id), words, words.join(' | ')],
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
