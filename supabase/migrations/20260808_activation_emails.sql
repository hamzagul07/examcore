-- Activation email series: per-stage dedup + its own opt-out.
--
-- Why a stage counter rather than a timestamp alone: the series is three
-- separate emails with different jobs (day 2 "here is your question", day 5
-- "here is what the marking looks like", day 10 "what stopped you"). A single
-- last-sent stamp cannot tell whether someone already had stage 2, so a stalled
-- cron or a re-run would resend it. `activation_email_stage` is the high-water
-- mark: the batch only ever sends stage N+1, so every user gets each stage at
-- most once, whatever the cron does.
--
-- 0 = nothing sent yet. Stages are defined in lib/activation/nudge.ts.
--
-- The batch reads these with select *, so it tolerates this migration not being
-- applied yet — it simply finds no candidates rather than erroring.

alter table public.user_profiles
  add column if not exists activation_email_stage smallint not null default 0,
  add column if not exists activation_email_last_sent_at timestamptz;

comment on column public.user_profiles.activation_email_stage is
  'High-water mark of the activation series (0 = none sent). The batch sends only stage+1, so each stage goes out at most once per user.';

-- Separate from email_product_updates: activation mail is lifecycle, sent to
-- someone who signed up and never used the product, and is not marketing. A
-- student who wants no promotional mail should still be told how to start.
alter table public.user_profiles
  add column if not exists email_activation boolean not null default true;

comment on column public.user_profiles.email_activation is
  'Opt-out for the activation series (unsubscribe kind ''activation''). Lifecycle, not marketing — see email_product_updates for the promotional opt-in.';

-- Index the batch predicate. Without it every run sequential-scans user_profiles
-- to find candidates; small now, but this runs daily and the table only grows.
create index if not exists user_profiles_activation_idx
  on public.user_profiles (activation_email_stage, activation_email_last_sent_at)
  where email_activation;
