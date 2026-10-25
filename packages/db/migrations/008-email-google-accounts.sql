ALTER TABLE reader_accounts ADD COLUMN email text;
ALTER TABLE reader_accounts ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
ALTER TABLE reader_accounts ADD COLUMN google_sub text UNIQUE;
ALTER TABLE reader_accounts ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE reader_accounts ALTER COLUMN recovery_hash DROP NOT NULL;
CREATE UNIQUE INDEX reader_accounts_email_unique ON reader_accounts(lower(email)) WHERE email IS NOT NULL;
CREATE TABLE reader_oauth_states (
 state_hash text PRIMARY KEY, browser_hash text NOT NULL, verifier text NOT NULL, nonce text NOT NULL,
 purpose text NOT NULL CHECK(purpose IN ('signin','link','delete')),
 account_id uuid REFERENCES reader_accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
