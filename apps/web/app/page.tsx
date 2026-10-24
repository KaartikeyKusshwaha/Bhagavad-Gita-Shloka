import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
import { Explore } from '../components/explore';
import { modelReady, modelName } from '@core/llm/src/provider';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const db = await getDatabase();
  const [works, ready, index] = await Promise.all([
    getWorks(db),
    modelReady('embedding'),
    db.query('SELECT EXISTS(SELECT 1 FROM embeddings WHERE model=$1) AS indexed', [
      modelName('embedding'),
    ]),
  ]);
  const semanticAvailable = ready && index.rows[0].indexed === true;
  return (
    <Explore
      semanticAvailable={semanticAvailable}
      works={works.map((w) => ({
        slug: String(w.slug),
        title: String(w.title),
        tradition_name: String(w.tradition_name),
      }))}
    />
  );
}
