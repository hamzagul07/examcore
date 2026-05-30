ALTER TABLE mark_schemes ADD COLUMN IF NOT EXISTS marking_type text;
COMMENT ON COLUMN mark_schemes.marking_type IS 'mcq | point_based | level_of_response | mixed — detected at extraction time';
