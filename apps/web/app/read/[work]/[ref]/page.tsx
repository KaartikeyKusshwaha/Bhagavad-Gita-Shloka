import { notFound } from 'next/navigation';
import { getDatabase } from '@core/db/src/index';
import { getDivisions, getPassage, getContext } from '@core/db/src/queries';
import { Reader } from '../../../../components/reader';
export const dynamic = 'force-dynamic';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ work: string; ref: string }>;
}) {
  const { ref } = await params;
  return { title: ref.replace('-', ' ') };
}
export default async function PassagePage({
  params,
}: {
  params: Promise<{ work: string; ref: string }>;
}) {
  const { work, ref } = await params,
    db = await getDatabase(),
    passage = await getPassage(db, work, decodeURIComponent(ref));
  if (!passage) notFound();
  return (
    <Reader
      divisions={
        (await getDivisions(db, work)) as unknown as {
          number: number;
          verse_count: number;
          title: string;
        }[]
      }
      passages={[passage]}
      chapter={passage.chapter}
      context={await getContext(db, passage)}
    />
  );
}
