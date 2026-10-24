import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
import { Explore } from '../components/explore';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const works = await getWorks(await getDatabase());
  return (
    <Explore
      works={works.map((w) => ({
        slug: String(w.slug),
        title: String(w.title),
        tradition_name: String(w.tradition_name),
      }))}
    />
  );
}
