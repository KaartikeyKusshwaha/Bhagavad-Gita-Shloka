ALTER TABLE works ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
ALTER TABLE divisions ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
ALTER TABLE passages ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
CREATE INDEX passages_division_order ON passages(division_id,ordinal);
CREATE INDEX translations_source_passage ON translations(source_id,passage_id);
CREATE OR REPLACE VIEW published_passages AS SELECT p.* FROM passages p JOIN sources s ON s.id=p.source_id WHERE s.status='approved';
CREATE INDEX passages_fts_english ON passages USING gin(to_tsvector('english',text_norm)) WHERE original_script='Latin';
