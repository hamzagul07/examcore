-- Streak-at-risk nudge: opt-out preference + once-a-day dedup stamp.
-- Mirrors the review-digest / weekly-report columns. The batch reads these
-- best-effort (select *), so it tolerates this migration not yet being applied
-- (in-app notifications still fire; only dedup + email opt-out need the columns).

alter table public.user_profiles
  add column if not exists email_streak_reminders boolean not null default true,
  add column if not exists streak_nudge_last_sent_at timestamptz;
