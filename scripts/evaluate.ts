import { readFile } from 'node:fs/promises';
import { connectDatabase } from '../packages/db/src/index.ts';
import { migrate } from '../packages/db/src/migrate.ts';
import { ingestGita } from '../packages/ingest/src/index.ts';
import { searchPassages } from '../packages/search/src/index.ts';
import { verifyClaim } from '../packages/verify/src/index.ts';
interface SearchCase {
  query: string;
  expected_refs: string[];
  category: string;
}
interface VerifyCase {
  claim: string;
  expected_verdict: string;
  claimed_source?: string;
}
let searches: SearchCase[] = [],
  claims: VerifyCase[] = [];
try {
  const signoff = JSON.parse(await readFile('data/eval/review.json', 'utf8')) as {
    reviewer: string;
    reviewed_at: string;
  };
  if (!signoff.reviewer || !signoff.reviewed_at) throw new Error('Named human review required');
  searches = (await readFile('data/eval/search.jsonl', 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  claims = (await readFile('data/eval/verify.jsonl', 'utf8'))
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  if (searches.length < 50 || claims.length < 60)
    throw new Error('At least 50 search queries and 60 verification claims required');
} catch (error) {
  console.log(
    JSON.stringify({
      status: 'pending',
      reason:
        'Human-written evaluation files and reviewer signoff are required; no benchmark score is claimed.',
      detail: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exit(process.argv.includes('--allow-pending') ? 0 : 2);
}
const db = await connectDatabase({ memory: true });
try {
  await migrate(db);
  await ingestGita(db);
  let found = 0,
    correct = 0;
  for (const row of searches) {
    const hits = await searchPassages(db, row.query, { limit: 5 });
    if (hits.some((h) => row.expected_refs.includes(h.passage.ref))) found++;
  }
  for (const row of claims) {
    const result = await verifyClaim(db, row.claim, row.claimed_source);
    if ('verdict' in result && result.verdict === row.expected_verdict) correct++;
  }
  const recall = found / searches.length,
    accuracy = correct / claims.length;
  console.log(
    JSON.stringify({
      recall_at_5: recall,
      verdict_accuracy: accuracy,
      search_cases: searches.length,
      verify_cases: claims.length,
    }),
  );
  if (recall < 0.8 || accuracy < 0.85) process.exitCode = 1;
} finally {
  await db.close();
}
