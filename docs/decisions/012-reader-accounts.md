# 012: Free private reader accounts

The owner requested individual dashboards, tracking, reading lessons, bookmarks and
Explore history. This supersedes the previous browser-only restriction for users who
choose an account. Guests do not acquire accounts or upload saved history implicitly.

## Implementation

- PostgreSQL migration 007 creates reader accounts, sessions and versioned private
  dashboard payloads, separate from scripture and public contribution records.
- Usernames avoid collecting email or depending on paid email infrastructure. Names
  are display labels. Passwords use salted asynchronous scrypt (N=32768,r=8,p=3), with
  one concurrent password operation to bound memory on the existing 1 GB Oracle VM.
- Session cookies are HttpOnly and SameSite=Lax, and Secure with __Host- prefix in
  production. Only SHA-256 session token hashes are stored. Seven-day absolute expiry.
- Recovery codes have 192 random bits, are stored hashed and rotated on successful
  recovery. Recovery revokes all sessions. Codes cannot be retrieved after display.
- Mutation requests require a custom same-origin header, reject cross-site fetch
  metadata and validate Origin when present. No cross-origin access is enabled.
- Authentication attempts have per-IP limits. Account reads and writes are no-store;
  all database queries derive the owner from the session, never a caller-selected ID.
  Writes also check the active account ID to protect against stale tabs after switching.
- Device and learning stores share existing schemas. Signed-in data stays in memory
  on the client, backed by the server; it is not left in localStorage on sign-out.
  Guest data is preserved separately. Other tabs reload on explicit account changes.
- Debounced saves serialize with optimistic revision checks. Conflicts never silently
  overwrite newer data. Pending writes warn before leaving. Sync failures show an
  export option; reload is explicit and can discard uncommitted changes.
- Study retains its existing layout: activity, saved passages and tools. Account
  controls are a header link and focused account page, not a fourth main destination.

## Limits

No social login or email delivery/verification. Losing both password and recovery code
requires creating a new account. Sync pulls on page initialization/reload, not realtime
collaboration. Account data is not end-to-end encrypted. Deletion removes live rows and
sessions via cascading foreign keys; existing database backups need retention handling.
The existing historical-text, machine-translation and model-use restrictions remain.
