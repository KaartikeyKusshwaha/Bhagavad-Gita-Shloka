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
          No advertising, third-party analytics, or tracking scripts are used. Preferences,
          bookmarks, reading progress, activity, and Explore history stay in this browser for
          historical guest data. Explore, Read and Study now require sign-in. When signed in,
          bookmarks, notes, activity, reading plans, revision cards and saved Explore conversations
          synchronize to your private account on our server.
        </p>
        <h2>Accounts</h2>
        <p>
          Accounts use an email address or username, a display name and a hashed website password.
          Email addresses are login identifiers; password signup does not verify mailbox ownership
          or send email. A private recovery code can reset your password and is replaced after use.
          Sessions use an HttpOnly cookie and expire after seven days. Sign out on shared devices.
          Account data is held in the site database; it is not end-to-end encrypted. You can
          permanently delete your live account and saved data in account settings. Database backups
          may retain copies until rotated. Importing guest data is optional. Multiple devices use
          version checks; a conflict asks you to reload rather than silently replacing newer saved
          data.
        </p>
        <h2>Optional Google sign-in</h2>
        <p>
          When configured, Google sign-in shares your Google account identifier, verified email and
          basic display name with this website. We request only OpenID, email and profile scopes,
          not access to Gmail messages, contacts or Drive. Google tokens are verified and are not
          stored for later API use. A matching email does not automatically link an existing
          password account; sign in first and explicitly link Google. Google-only accounts use
          Google for recovery and fresh Google authentication for account deletion.
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
          Reading plans and spaced-revision dates are also stored in your browser as a guest, or in
          your account when signed in. Remove a plan or individual revision entries in Study tools.
          Classroom share links contain the chosen references, title and discussion questions in the
          URL fragment; anyone with the link can read them. The application does not save a server
          lesson record. Avoid personal information in classroom links.
        </p>
        <h2>Search and quotation checks</h2>
        <p>
          When model services are configured, meaning-search text is sent to the configured
          embedding runtime. Ask sends your question, up to three preceding exchanges, and
          attributed source evidence to the configured answer runtime. If you enable “Use relevant
          saved conversations,” up to two relevant earlier exchanges can also be sent. Private
          bookmark notes are never included. Saved conversations remain in this browser; only the
          selected context is used for that request.{' '}
          {process.env.MODEL_PROVIDER === 'groq'
            ? 'This deployment uses Groq for Ask; Groq receives that question, context and evidence under its own data policies. Do not include personal or sensitive information.'
            : 'The local demo can use existing Qwen models on the host computer.'}{' '}
          Meaning search uses a Qwen embedding runtime on the website host. Provider availability is
          checked; no answer is generated when the runtime is unavailable.
        </p>
        <p>
          Optional study translation sends only the selected eligible passage and target language to
          the answer provider. Translations are labelled unreviewed and temporarily cached in server
          memory. Conversations do not train or permanently update the model.
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
          storage to remove all saved history, activity, preferences, bookmarks, and progress. Use
          account settings to delete your live account and synchronized data. The legacy DELETE
          /v1/me/data endpoint does not delete accounts or clear browser storage.
        </p>
      </div>
    </div>
  );
}
