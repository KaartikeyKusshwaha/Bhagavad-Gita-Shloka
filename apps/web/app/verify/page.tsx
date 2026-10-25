import { VerifyForm } from '../../components/verify-form';
import { getDatabase } from '@core/db/src/index';
import { getWorks } from '@core/db/src/queries';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Verify a quotation' };
export default async function VerifyPage() {
  const works = await getWorks(await getDatabase());
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">A QUOTE DESERVES ITS CONTEXT</span>
        <h1>
          Bring the words.
          <br />
          <em>Follow the source.</em>
        </h1>
        <p>
          Check whether wording occurs in our published collection and whether its attribution
          matches. See the original passage before any explanation.
        </p>
      </div>
      <VerifyForm
        works={works.map((w) => ({
          slug: String(w.slug),
          title: String(w.title),
          tradition: String(w.tradition_name),
        }))}
      />
      <div className="notice" style={{ maxWidth: 800 }}>
        <strong>Evidence before certainty.</strong> Quotation matching checks stored editions. A
        separate AI assessment explains how the retrieved passages relate to your claim, with
        citations. Review the source and surrounding text; an AI assessment is not a scholarly
        ruling.
      </div>
    </div>
  );
}
