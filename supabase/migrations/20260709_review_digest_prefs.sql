-- Spaced-review re-engagement: opt-out flag + dedup timestamp for the weekly
-- "topics due for review" digest (email + in-app notification).
alter table public.user_profiles
  add column if not exists email_review_digest boolean not null default true,
  add column if not exists review_digest_last_sent_at timestamptz;
