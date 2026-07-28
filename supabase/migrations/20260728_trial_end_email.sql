-- Reverse-trial emails: opt-out preference + one send stamp per phase.
-- Mirrors the weekly-report columns (email_weekly_report /
-- weekly_report_last_sent_at).
--
-- Two stamps, not one: the batch sends at most twice per trial — the day
-- before expiry and the morning after — and each must dedup independently, or
-- a daily cron re-sends the same email every day of its window.
--
-- sendTrialEndBatch() reads these best-effort (select *), so it tolerates this
-- migration not being applied — it just degrades to "send once per cron run",
-- which is why TRIAL_EMAIL_SEND ships OFF.

alter table public.user_profiles
  add column if not exists email_trial_end boolean not null default true,
  add column if not exists trial_ending_email_sent_at timestamptz,
  add column if not exists trial_end_email_sent_at timestamptz;

comment on column public.user_profiles.email_trial_end is
  'Opt-out for the two reverse-trial emails. One-click unsubscribe kind is ''trial''.';
