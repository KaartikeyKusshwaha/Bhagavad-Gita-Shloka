import { notFound } from 'next/navigation';
import { getDatabase } from '@core/db/src/index';
import { getDivisions, getChapter } from '@core/db/src/queries';
import { Reader } from '../../../../../components/reader';
export const dynamic = 'force-dynamic';
export default async function ChapterPage({
  params,
}: {
  params: Promise<{ work: string; number: string }>;
}) {
  const { work, number } = await params;
  if (!/^\d{1,3}$/.test(number)) notFound();
  const db = await getDatabase(),
    passages = await getChapter(db, work, Number(number));
  if (!passages.length) notFound();
  return (
    <Reader
      divisions={
        (await getDivisions(db, work)) as unknown as {
          number: number;
          verse_count: number;
          title: string;
        }[]
      }
      passages={passages}
      chapter={Number(number)}
    />
  );
}
