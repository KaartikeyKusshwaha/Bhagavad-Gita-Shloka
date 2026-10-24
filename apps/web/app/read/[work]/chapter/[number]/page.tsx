import { notFound } from 'next/navigation';
import { getDatabase } from '@core/db/src/index';
import { getDivisions, getChapter } from '@core/db/src/queries';
import { Reader } from '../../../../../components/reader';
export const dynamic = 'force-dynamic';
export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ work: string; number: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { work, number } = await params;
  if (!/^\d{1,5}$/.test(number)) notFound();
  const page = Number((await searchParams).page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > 10000) notFound();
  const db = await getDatabase(),
    passages = await getChapter(db, work, Number(number), 80, (page - 1) * 80);
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
      page={page}
    />
  );
}
