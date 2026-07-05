-- Remove the automatic 7-day no-card reverse trial on signup.
-- trial_ends_at is now NULL by default; Scholar/Max trials are granted only
-- via Polar checkout (card collected, billed after 7 days).

alter table public.user_subscriptions
  alter column trial_ends_at set default null;

comment on column public.user_subscriptions.trial_ends_at is
  'Reserved for future use. Scholar/Max free trials are managed by Polar (status trialing). NULL = no reverse trial.';

-- End any in-progress reverse trials for users who never subscribed.
update public.user_subscriptions
set trial_ends_at = null
where tier = 'free'
  and polar_subscription_id is null
  and trial_ends_at is not null;
