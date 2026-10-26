import { getDatabase } from '@core/db/src/index';
import { getPassageById } from '@core/db/src/queries';
import { ReportForm } from '../../components/report-form';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Report an error' };
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ passage?: string }>;
}) {
  const { passage: id } = await searchParams,
    p = await getPassageById(await getDatabase(), id ?? 'bg.2.47');
  if (!p) notFound();
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">CORRECTED IN THE OPEN</span>
        <h1>Help the text speak clearly.</h1>
        <p>
          A missing mark, a wrong citation, a license concern—small corrections make a more
          trustworthy library. Published changes keep a public record.
        </p>
      </div>
      <ReportForm passageId={p.id} reference={p.ref} />
    </div>
  );
}
