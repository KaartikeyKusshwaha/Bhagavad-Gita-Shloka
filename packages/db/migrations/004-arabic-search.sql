-- Search-only simplification. Never change the verbatim original_text column.
UPDATE passages
SET text_norm = regexp_replace(
  replace(regexp_replace(text_norm, '[ؐ-ًؚ-ٰٟۖ-ۜ۟-ۤۧ-۪ۨ-ۭـ]', '', 'g'), 'ٱ', 'ا'),
  '\s+', ' ', 'g'
)
WHERE original_script = 'Arabic';
