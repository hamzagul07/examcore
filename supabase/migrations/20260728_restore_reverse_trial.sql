-- Restore the automatic 7-day no-card reverse trial on signup.
--
-- Reverses 20260705_remove_reverse_trial.sql. That change was a policy decision
-- taken alongside the pricing-page redesign (commit 68cae473), not a response to
-- abuse — nothing about the trial broke.
--
-- Why it comes back: measured 2026-07-28, 0 of 105 users had ever seen the paid
-- product and 0 had set a target grade, so every premium feature shipped in the
-- premium-feel initiative was starved of its one input. Freemium converts ~4.7%
-- of MAU; reverse trials convert far higher precisely because the student
-- experiences losing a record they built rather than gaining a feature they read
-- about.
--
-- Mechanism: handle_new_user_billing() inserts (user_id, tier) only and never
-- names trial_ends_at, so this column default is what grants the trial. Nothing
-- else needs to change — loadBillingContext() already maps access 'trial' to
-- Scholar-level caps (lib/billing/enforcement.ts), and effectiveAccess() already
-- resolves a future trial_ends_at to 'trial' (lib/billing/access.ts).

alter table public.user_subscriptions
  alter column trial_ends_at set default (now() + interval '7 days');

comment on column public.user_subscriptions.trial_ends_at is
  'End of the 7-day no-card reverse trial granted on signup. While in the future the user gets Scholar-level access and caps; after it they fall to the free tier with everything they produced still saved. NULL = no reverse trial. Polar checkout trials are separate (status = trialing with a paid tier).';

-- Deliberately NOT back-filling existing free users. Granting a retroactive
-- trial to the 129 existing free rows is a re-engagement campaign, not a schema
-- change: it should fire with an email announcing it, otherwise the trial
-- silently starts and expires while nobody is looking. To run it later:
--
--   update public.user_subscriptions
--   set trial_ends_at = now() + interval '7 days'
--   where tier = 'free' and polar_subscription_id is null and trial_ends_at is null;
