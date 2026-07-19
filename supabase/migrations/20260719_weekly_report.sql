-- Weekly examiner-report email (premium): opt-out preference + send dedup stamp.
-- Mirrors the review-digest columns (email_review_digest / review_digest_last_sent_at).
-- The batch reads these best-effort (select *), so it tolerates this migration not
-- yet being applied.

alter table public.user_profiles
  add column if not exists email_weekly_report boolean not null default true,
  add column if not exists weekly_report_last_sent_at timestamptz;
