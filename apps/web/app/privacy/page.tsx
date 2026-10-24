export const metadata = { title: 'Privacy' };
export const dynamic = 'force-dynamic';
export default function Privacy() {
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">A QUIET READING ROOM</span>
        <h1>Your reading belongs to you.</h1>
      </div>
      <div className="prose">
        <p>
          No accounts, advertising, third-party analytics, or tracking scripts are used.
          Preferences, bookmarks, reading progress, activity, and Explore history stay in this
          browser. They are not synchronized to an account.
        </p>
        <h2>Explore history and Study activity</h2>
        <p>
          Successful searches, quotations, and questions can be saved with their cited responses in
          Explore history on this device. You can pause saving, rename or delete conversations, or
          clear all history in the History drawer. History is limited to 90 days, 100 conversations,
          40 exchanges per conversation, and a device storage budget. Older entries may disappear
          earlier when the budget is reached. Safety-routed requests are not saved.
        </p>
        <p>
          The Study calendar records submitted queries and passages you deliberately mark read.
          Opening or reloading a page does not create activity. Counts use your local timezone. You
          can export or clear activity from Study. Clearing Explore history does not clear activity,
          bookmarks, or reading progress. Other people using this browser profile may see this local
          data.
        </p>
        <p>
          Reading plans and spaced-revision dates are also stored only in this browser. Remove a
          plan or individual revision entries in Study tools. Classroom share links contain the
          chosen references, title and discussion questions in the URL fragment; anyone with the
          link can read them. The application does not save a server lesson record. Avoid personal
          information in classroom links.
        </p>
        <h2>Search and quotation checks</h2>
        <p>
          When model services are configured, meaning-search text is sent to the configured
          embedding runtime. Ask sends your question, up to three preceding questions, and
          attributed source evidence to the configured answer runtime. Saved conversations remain in
          this browser; only the selected context is used for that request.{' '}
          {process.env.MODEL_PROVIDER === 'groq'
            ? 'This deployment uses Groq for Ask; Groq receives that question, context and evidence under its own data policies. Do not include personal or sensitive information.'
            : 'The local demo can use existing Qwen models on the host computer.'}{' '}
          Meaning search uses a Qwen embedding runtime on the website host. Provider availability is
          checked; no answer is generated when the runtime is unavailable.
        </p>
        <p>
          Search text is used for the request. Server verification logs contain a SHA-256 hash of
          the claim, verdict, and language; raw claims are not stored there. Logs may still reveal
          whether a known claim was checked. Application request logging is disabled.
        </p>
        <h2>Abuse prevention</h2>
        <p>
          Requests are limited by IP in process memory. Production daily limits use a keyed hash of
          the IP and date. Raw IP addresses are not stored in the application database. Hosting
          providers may process network addresses in their infrastructure logs under their own
          policies.
        </p>
        <h2>Reports and contributions</h2>
        <p>
          Reports retain the text you submit so the issue can be assessed. Avoid personal
          information. Approved corrections are public and attributed to their reviewer. No reporter
          email or identity is requested.
        </p>
        <h2>Voice</h2>
        <p>
          Voice input starts only when you select Start microphone. If on-device recognition is
          supported, it stays on your device. Otherwise, the browser’s speech provider may process
          audio online; the voice controls require your agreement before starting. This website does
          not receive or retain audio. You review the transcript before submitting it as a normal
          text request. Explanation playback uses installed local device voices. No synthetic sacred
          recitations are provided. Available human recitations stream from Wikimedia Commons only
          when you request playback; that host receives the network request.
        </p>
        <h2>Clear device data</h2>
        <p>
          Downloaded editions stay in this browser for offline reading and exact search. Remove an
          individual copy in the offline library or clear site storage to remove all downloads. Only
          the public offline reader and its interface files are cached; Ask responses, reports and
          Explore conversations are not cached by the offline service.
        </p>
        <p>
          Use the History and Study controls to remove those records, or clear this site's browser
          storage to remove all saved history, activity, preferences, bookmarks, and progress.
          DELETE /v1/me/data confirms that no account, audio, or transcript record is held on the
          server; it does not clear your browser's storage.
        </p>
      </div>
    </div>
  );
}
