CREATE TABLE reader_accounts (
 id uuid PRIMARY KEY, username text UNIQUE NOT NULL, name text NOT NULL,
 password_hash text NOT NULL, recovery_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reader_sessions (
 token_hash text PRIMARY KEY, account_id uuid NOT NULL REFERENCES reader_accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
CREATE INDEX reader_sessions_expiry ON reader_sessions(expires_at);
CREATE TABLE reader_data (
 account_id uuid PRIMARY KEY REFERENCES reader_accounts(id) ON DELETE CASCADE,
 revision integer NOT NULL DEFAULT 0, payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
