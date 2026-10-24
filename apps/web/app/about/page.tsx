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
    'Reader, chapter counts, context, citations, report flow and automated mobile accessibility checks implemented; independent audit pending',
  ],
  [
    'M3 · Search',
    'Exact, fuzzy and optional model-based meaning search implemented; independent recall evaluation pending',
  ],
  [
    'M4 · Verify',
    'Deterministic wording and attribution check; six-step meaning pipeline and human evaluation pending',
  ],
  [
    'M5 · More traditions',
    'Gita, Quran Arabic and Dhammapada Pali/English imported; further collections pending',
  ],
  [
    'M6 · Context & comparison',
    'Context, graph/list and keyword theme trails implemented; additional translations and scholarly cross-reference data pending',
  ],
  [
    'M7 · Website speech',
    'Browser dictation, explanation playback and one licensed human Al-Fatiha recording implemented; voice quality depends on device/language',
  ],
  [
    'M8 · Offline reading',
    'Downloaded editions, offline exact search and network-disabled browser checks implemented',
  ],
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
          A free, open-source college project for scripture reading and quotation checks. No
          paywall, advertising, or account required to read.
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
          This beta includes the Bhagavad Gita, Quran and Dhammapada. All traditions use the same
          data model and retrieval rules. The platform does not rank religions, issue personal
          religious rulings, or generate sacred text.
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
          Collection labels describe the actual editions available here. This college website
          remains a beta pending independent text review and final maintainer testing.
        </p>
      </div>
    </div>
  );
}
