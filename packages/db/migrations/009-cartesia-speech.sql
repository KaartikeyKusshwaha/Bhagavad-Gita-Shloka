CREATE TABLE speech_usage (
  month text PRIMARY KEY,
  characters integer NOT NULL CHECK(characters >= 0)
);
CREATE TABLE speech_cache (
  key text PRIMARY KEY,
  audio bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
