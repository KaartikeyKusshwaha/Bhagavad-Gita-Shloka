import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
import { Explore } from '../components/explore';
import { semanticCoverage } from '@core/search/src/semantic';
import { modelReady } from '@core/llm/src/provider';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const db = await getDatabase(),
    works = await getWorks(db),
    coverage = await semanticCoverage(db);
  return (
    <Explore
      semanticAvailable={coverage.indexed > 0 && (await modelReady('embedding'))}
      works={works.map((w) => ({
        slug: String(w.slug),
        title: String(w.title),
        tradition_name: String(w.tradition_name),
      }))}
    />
  );
}
