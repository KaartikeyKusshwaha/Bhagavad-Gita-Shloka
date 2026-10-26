CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE traditions (id text PRIMARY KEY, slug text UNIQUE NOT NULL, name text NOT NULL, board_status text NOT NULL DEFAULT 'beta');
CREATE TABLE sources (
 id text PRIMARY KEY, tradition_id text REFERENCES traditions(id), name text NOT NULL,
 url text NOT NULL, license text NOT NULL DEFAULT '', license_url text NOT NULL DEFAULT '',
 commercial_ok boolean NOT NULL DEFAULT false, attribution text NOT NULL DEFAULT '',
 retrieved_at text NOT NULL DEFAULT '', checksum text NOT NULL DEFAULT '', version text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','blocked')),
 display_rules jsonb NOT NULL DEFAULT '{}',
 CHECK(status <> 'approved' OR (license <> '' AND license_url <> '' AND attribution <> '' AND retrieved_at <> '' AND checksum <> ''))
);
CREATE TABLE works (id text PRIMARY KEY, tradition_id text NOT NULL REFERENCES traditions(id), slug text UNIQUE NOT NULL, title text NOT NULL, original_lang text NOT NULL, canon_order int NOT NULL DEFAULT 0);
CREATE TABLE divisions (id text PRIMARY KEY, work_id text NOT NULL REFERENCES works(id), parent_id text REFERENCES divisions(id), kind text NOT NULL DEFAULT 'chapter', number int NOT NULL, title text NOT NULL, summary text, UNIQUE(work_id,number));
CREATE TABLE passages (id text PRIMARY KEY, work_id text NOT NULL REFERENCES works(id), division_id text NOT NULL REFERENCES divisions(id), source_id text NOT NULL REFERENCES sources(id), ref text NOT NULL, ordinal int NOT NULL, verse_number int NOT NULL, original_text text NOT NULL, text_norm text NOT NULL, original_script text NOT NULL, transliteration text NOT NULL DEFAULT '', transliteration_norm text NOT NULL DEFAULT '', UNIQUE(work_id,ref), UNIQUE(work_id,ordinal));
CREATE TABLE translations (id text PRIMARY KEY, passage_id text NOT NULL REFERENCES passages(id), source_id text NOT NULL REFERENCES sources(id), lang text NOT NULL, translator text NOT NULL, text text NOT NULL, text_norm text NOT NULL, is_machine boolean NOT NULL DEFAULT false, source_ref text NOT NULL DEFAULT '', UNIQUE(passage_id,source_id,lang,translator));
CREATE INDEX passages_trgm ON passages USING gin(text_norm gin_trgm_ops);
CREATE INDEX translations_trgm ON translations USING gin(text_norm gin_trgm_ops);
CREATE INDEX passages_fts ON passages USING gin(to_tsvector('simple',text_norm));
CREATE INDEX translations_fts_en ON translations USING gin(to_tsvector('english',text_norm)) WHERE lang='en';
CREATE INDEX translations_fts_hi ON translations USING gin(to_tsvector('simple',text_norm)) WHERE lang='hi';
CREATE VIEW published_passages AS SELECT p.* FROM passages p JOIN sources s ON s.id=p.source_id WHERE s.status='approved';
CREATE VIEW published_translations AS SELECT t.* FROM translations t JOIN sources s ON s.id=t.source_id JOIN published_passages p ON p.id=t.passage_id WHERE s.status='approved';
