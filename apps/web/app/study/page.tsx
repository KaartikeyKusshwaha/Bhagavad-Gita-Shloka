import { Study } from '../../components/study';
import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your study' };
export default async function StudyPage() {
  const works = (await getWorks(await getDatabase())).map((w) => ({
    slug: String(w.slug),
    title: String(w.title),
    passage_count: Number(w.passage_count),
  }));
  return <Study works={works} />;
}
