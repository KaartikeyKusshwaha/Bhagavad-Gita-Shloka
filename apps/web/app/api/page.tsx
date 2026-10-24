export const metadata = { title: 'Developer API' };
const routes = [
  ['GET', '/v1/traditions', 'Collection coverage and reviewer status'],
  ['GET', '/v1/works', 'Published works; optional tradition filter'],
  ['GET', '/v1/works/bhagavad-gita/divisions', 'Chapter counts from the database'],
  ['GET', '/v1/works/quran/chapters/2?page=2', 'Paginated section text: 80 passages per page'],
  ['POST', '/v1/study-translation', 'Eligible passage_id and target_lang; unreviewed AI study aid'],
  [
    'GET',
    '/v1/passages/bhagavad-gita/BG-2.47',
    'Primary text, translations, and full license records',
  ],
  ['GET', '/v1/passages/bhagavad-gita/BG-2.47/context', 'Five passages before and after'],
  ['GET', '/v1/search?q=karma', 'Exact and fuzzy search; mode, work, tradition, lang, limit'],
  ['POST', '/v1/verify', 'JSON: claim, claimed_source?, lang'],
  ['POST', '/v1/reports', 'JSON: passage_id, kind, message'],
  ['GET', '/v1/sources', 'Source and data-quality records'],
  ['GET', '/v1/corrections', 'Public reviewer-approved corrections'],
  ['GET', '/v1/health', 'Database state and actual capabilities'],
];
export default function Api() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">BUILD SOMETHING OPEN</span>
        <h1>
          The same collection.
          <br />
          <em>A public interface.</em>
        </h1>
        <p>
          Read endpoints require no authentication. Responses carry citations, source licenses, and
          structured errors. Limit: 60 requests per minute, 600 verification or ask requests per
          day.
        </p>
      </div>
      <p className="notice">
        <a href="/openapi.json">Download the OpenAPI specification →</a>
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {routes.map(([method, path, note]) => (
              <tr key={path}>
                <td>{method}</td>
                <td>
                  <code>{path}</code>
                </td>
                <td>{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="prose">
        <h2>Keep the attribution attached</h2>
        <p>
          Reusers must preserve the source, citation, and applicable license. See /v1/sources before
          redistributing a text. Meaning search and cited Ask depend on configured providers.
          Browser dictation requires transcript review. Optional AI study translations are labelled
          unreviewed, kept separate from published editions and disabled for restricted sources. No
          expert pronunciation assessment is offered.
        </p>
      </div>
    </div>
  );
}
