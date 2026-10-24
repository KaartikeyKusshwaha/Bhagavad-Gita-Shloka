export const metadata = { title: 'Privacy' };
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
        <h2>Search and quotation checks</h2>
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
          Voice upload is not enabled yet. Audio is not accepted or retained. No synthetic sacred
          recitations are provided.
        </p>
        <h2>Clear device data</h2>
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
