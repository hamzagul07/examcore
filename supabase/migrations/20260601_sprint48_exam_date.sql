ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS exam_date date NULL;
COMMENT ON COLUMN user_profiles.exam_date IS 'Optional target exam date for countdown on dashboard home';
