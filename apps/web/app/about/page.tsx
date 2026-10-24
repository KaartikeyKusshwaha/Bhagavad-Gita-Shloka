import Link from 'next/link';
export const metadata = { title: 'About & roadmap' };
const rows = [
  ['M0 · Foundation', 'Implemented; CI and deployment validation in progress'],
  [
    'M1 · Gita data',
    '700 passages and 700 human translations imported; printed-edition sample signoff pending',
  ],
  [
    'M2 · Reader & API',
    'Reader, chapter counts, context, citations, and report flow implemented; accessibility audit pending',
  ],
  [
    'M3 · Search',
    'Exact + fuzzy implemented; multilingual semantic worker and human recall evaluation pending',
  ],
  [
    'M4 · Verify',
    'Deterministic wording and attribution check; six-step meaning pipeline and human evaluation pending',
  ],
  ['M5 · More traditions', 'Source and reviewer gates pending; not included in search'],
  [
    'M6 · Context & comparison',
    'Surrounding passages available; additional translations, commentary, themes, and cross-references pending',
  ],
  [
    'M7 · Speech & WhatsApp',
    'Provider setup, licensed audio, and language review pending; disabled',
  ],
  ['M8 · Offline & clients', 'Offline and companion clients in development'],
  [
    'M9 · Community',
    'Reports and gated correction API implemented; named reviewers and remaining community tools pending',
  ],
];
export default function About() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">WHY THIS EXISTS</span>
        <h1>
          More understanding.
          <br />
          <em>Fewer words without a source.</em>
        </h1>
        <p>
          An open-source, non-profit scripture reading and quotation-checking platform. No paywall,
          advertising, or account required to read.
        </p>
      </div>
      <div className="prose">
        <h2>Start with the text</h2>
        <p>
          Scripture, human translation, commentary, and machine explanation are different layers.
          They deserve clear labels and separate spaces. Every published passage includes a license
          and a path to its source.
        </p>
        <p>
          This beta begins with the Bhagavad Gita. All traditions use the same data model and
          retrieval rules. The platform does not rank religions, issue personal religious rulings,
          or generate sacred text.
        </p>
        <h2>What is ready, and what is still a promise</h2>
        <p>
          Implementation status is not a claim that a milestone’s scholarly or quality gates have
          passed. Human-written evaluations, printed-edition samples, named reviewers, and
          permissions remain explicit release requirements.
        </p>
      </div>
      <table className="data-table">
        <caption className="sr-only">Implementation roadmap</caption>
        <thead>
          <tr>
            <th>Milestone</th>
            <th>Current status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, status]) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="prose">
        <h2>Contribute with care</h2>
        <p>
          Text corrections, source provenance, language review, accessibility feedback, and
          development all help.{' '}
          <a href="https://github.com/KaartikeyKusshwaha/Bhagavad-Gita-Shloka">
            Read the source and contribution guide
          </a>
          , or <Link href="/report">report a text issue</Link>.
        </p>
        <p>
          A tradition remains beta until a named reviewer from that tradition approves its samples
          and prompts. The maintainer handles the project’s legal non-profit setup and appointment
          of reviewers.
        </p>
      </div>
    </div>
  );
}
