-- Profile fields for Sprint 40 onboarding + celebration tracking
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS primary_goal TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS celebrations_seen TEXT[] DEFAULT '{}';

-- Existing users: treat as onboarding complete (do not force re-onboarding)
UPDATE user_profiles
SET onboarding_completed = COALESCE(onboarded, true)
WHERE onboarding_completed IS NULL;

ALTER TABLE user_profiles
  ALTER COLUMN onboarding_completed SET DEFAULT false;

UPDATE user_profiles
SET onboarding_completed = true
WHERE onboarded = true AND onboarding_completed IS DISTINCT FROM true;

ALTER TABLE user_profiles
  ALTER COLUMN onboarding_completed SET NOT NULL;
