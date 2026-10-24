import { notFound } from 'next/navigation';
import { getDatabase } from '@core/db/src/index';
import { getDivisions, getChapter, getContext } from '@core/db/src/queries';
import { Reader } from '../../../components/reader';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Read' };
export default async function WorkPage({ params }: { params: Promise<{ work: string }> }) {
  const { work } = await params,
    db = await getDatabase();
  const divisions = await getDivisions(db, work),
    passage = divisions.length
      ? (await getChapter(db, work, Number(divisions[0].number)))[0]
      : null;
  if (!passage) notFound();
  return (
    <Reader
      divisions={divisions as unknown as { number: number; verse_count: number; title: string }[]}
      passages={[passage]}
      chapter={1}
      context={await getContext(db, passage)}
    />
  );
}
