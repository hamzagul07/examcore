-- Pricing overhaul: 7-day no-card reverse trial.
--
-- New subscription rows are created by handle_new_user_billing() on signup
-- (INSERT user_id, tier) without specifying trial_ends_at, so this column
-- default grants every new user a 7-day full-access trial automatically.
--
-- Existing rows (created before this migration) keep trial_ends_at = NULL —
-- they are past users and resolve to the free tier, which is correct.

alter table public.user_subscriptions
  add column if not exists trial_ends_at timestamptz default (now() + interval '7 days');

comment on column public.user_subscriptions.trial_ends_at is
  'End of the 7-day no-card reverse trial. While in the future the user has Pro-level access; after it they fall to the free tier. NULL = no trial.';
