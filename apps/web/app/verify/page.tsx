import { VerifyForm } from '../../components/verify-form';
export const metadata = { title: 'Verify a quotation' };
export default function VerifyPage() {
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
      <VerifyForm />
      <div className="notice" style={{ maxWidth: 800 }}>
        <strong>A careful beginning.</strong>This beta confirms text matches and reference
        differences. It does not yet judge meaning, mistranslation, disputed readings, or whether
        words were taken out of context. Those require the semantic model and human evaluation
        gates.
      </div>
    </div>
  );
}
