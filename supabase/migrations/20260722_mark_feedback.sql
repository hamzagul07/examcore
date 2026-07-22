-- Phase 3: post-mark feedback.
--
-- Two gaps closed by one prompt. There was no signal anywhere on whether the
-- marking was actually any good — accuracy was assumed, never measured — and
-- no user voice anywhere on the site, so a first-time visitor had nothing to
-- go on but our own claims. Asking one question at the moment of highest
-- context ("was this fair?") produces both.
--
-- Testimonial use is opt-in and separately approved: consent alone never puts
-- a quote on the marketing site.

create table if not exists public.mark_feedback (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.attempts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  -- The core signal.
  rating text not null check (rating in ('up', 'down')),
  -- Structured follow-up on a thumbs-down: what specifically went wrong.
  reason text check (
    reason in (
      'too_harsh',
      'too_generous',
      'misread_my_work',
      'wrong_mark_scheme',
      'unclear_feedback',
      'other'
    )
  ),
  comment text,
  -- Denormalised so quality can be sliced without joining attempts, and so a
  -- deleted attempt doesn't erase the accuracy signal it produced.
  subject_code text,
  marks_earned integer,
  total_marks integer,
  marking_mode text,
  -- Testimonial pipeline. share_consent is the user's choice; approved_at is
  -- ours. BOTH are required before a quote is ever displayed.
  share_consent boolean not null default false,
  display_name text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- One verdict per attempt: re-rating updates rather than stacks.
-- Deliberately NOT partial. `ON CONFLICT (attempt_id)` cannot infer a partial
-- unique index, so the upsert in /api/mark/feedback would fail with 42P10.
-- Postgres treats NULLs as distinct here anyway, so rows with no attempt are
-- still unconstrained — the partial predicate bought nothing.
create unique index if not exists mark_feedback_attempt_unique
  on public.mark_feedback (attempt_id);

create index if not exists mark_feedback_created_idx
  on public.mark_feedback (created_at desc);
create index if not exists mark_feedback_rating_idx
  on public.mark_feedback (rating, created_at desc);
-- Partial index for the landing-page query: the only rows it ever reads.
create index if not exists mark_feedback_approved_idx
  on public.mark_feedback (approved_at desc)
  where approved_at is not null and share_consent;

alter table public.mark_feedback enable row level security;

-- ⚠️ SUPERSEDED BY 20260722_mark_feedback_lockdown.sql — DO NOT COPY.
-- These policies constrain only `user_id`, leaving `approved_at` and
-- `share_consent` writable, which let any signed-in user publish an
-- "approved" testimonial on the public homepage via PostgREST. The lockdown
-- migration revokes the underlying grants and drops both policies; all writes
-- go through /api/mark/feedback as the service role. Kept here as the record of
-- what was applied — a fresh database runs both and converges on the safe state.
drop policy if exists "insert own mark feedback" on public.mark_feedback;
create policy "insert own mark feedback"
  on public.mark_feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "update own mark feedback" on public.mark_feedback;
create policy "update own mark feedback"
  on public.mark_feedback for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.mark_feedback is
  'Post-mark "was this fair?" verdicts. Doubles as the marking-accuracy signal and the (opt-in, separately approved) testimonial source.';

-- Marking quality over time. A falling fair-rate is the earliest warning that
-- a prompt or model change has made the marking worse.
create or replace view public.mark_feedback_daily_stats
with (security_invoker = true) as
select
  date_trunc('day', created_at)::date as day,
  count(*) as responses,
  count(*) filter (where rating = 'up') as rated_fair,
  count(*) filter (where rating = 'down') as rated_unfair,
  round(
    100.0 * count(*) filter (where rating = 'up') / nullif(count(*), 0),
    1
  ) as fair_rate_pct,
  count(*) filter (where reason = 'too_harsh') as too_harsh,
  count(*) filter (where reason = 'too_generous') as too_generous,
  count(*) filter (where reason = 'misread_my_work') as misread,
  count(*) filter (where reason = 'wrong_mark_scheme') as wrong_scheme
from public.mark_feedback
group by 1
order by 1 desc;

comment on view public.mark_feedback_daily_stats is
  'Daily marking fairness rate and failure-mode breakdown, straight from students.';
