-- Remove both trials: the 7-day no-card reverse trial and the Scholar/Max
-- checkout trial.
--
-- Reverses 20260728_restore_reverse_trial.sql and 20260728_trial_end_email.sql.
-- Policy decision, not a defect: 194 accounts had produced 2 paying subscribers,
-- and the reverse trial was the second attempt at the same mechanism (removed
-- 20260705, restored 20260728). Access is now paid or free, with no timer.
--
-- APPLY THIS AFTER THE APPLICATION DEPLOY, NOT BEFORE.
-- The previously deployed code selects trial_ends_at in loadBillingContext() and
-- four page/route queries. Dropping the column while that code is live turns
-- every billing read into a PostgREST error, which blocks marking for everyone.
-- The new code never references it, so once deployed this is pure cleanup.
--
-- The 47 accounts holding an unexpired trial_ends_at are cut off by the deploy
-- itself: effectiveAccess() no longer reads the column, so they resolve to
-- 'free' the moment the new code is live. This migration does not change who
-- has access; it removes the column that no longer means anything.
--
-- The Polar checkout trial is switched off in app/api/billing/checkout/route.ts
-- (trialInterval / trialIntervalCount are no longer sent). Measured at write
-- time, 0 subscriptions were in status 'trialing', so no one loses a trial they
-- had already started. Polar itself has no trial configured on the products —
-- it was always passed per-checkout — so nothing needs changing there.
--
-- `trialing` deliberately stays in ACTIVE_STATUSES (lib/billing/access.ts): it
-- costs nothing and keeps any straggler Polar reports from losing access.
--
-- To restore, if this is reversed a third time:
--
--   alter table public.user_subscriptions
--     add column trial_ends_at timestamptz default (now() + interval '7 days');
--   alter table public.user_profiles
--     add column email_trial_end boolean not null default true;
--
-- and revert the application changes; nothing here is depended on by a
-- constraint, index, trigger or policy. handle_new_user_billing() inserts
-- (user_id, tier) only and never named trial_ends_at, so it is unaffected.

-- Dropping the column takes its default with it, so there is no separate
-- `alter column ... drop default` step: that form has no IF EXISTS guard and
-- would make a re-run fail rather than no-op.
alter table public.user_subscriptions
  drop column if exists trial_ends_at;

-- The trial-end email and its one-click unsubscribe kind are gone, so the
-- preference has nothing to govern. 0 accounts had opted out, so no user
-- choice is being discarded.
alter table public.user_profiles
  drop column if exists email_trial_end;
