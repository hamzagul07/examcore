-- Marking latency work: measure it, then stop making the student sit through it.
--
-- Context. mark_runs recorded only a total duration, so "marking takes 3–4
-- minutes" could not be attributed to a stage. Measured over the first 28 runs:
-- p50 148s, p90 367s, and runs that hit a Gemini retry averaged 384s against
-- 128s for runs that did not. This migration adds the columns the fixes need.

-- 1. Per-stage attribution -----------------------------------------------------
-- { "reading_work": 8123, "finding_scheme": 2201, "marking": 61044, ... }
-- Written on settle from timings accumulated in lib/marking/mark-run-log.ts.
alter table public.mark_runs
  add column if not exists stage_timings jsonb;

comment on column public.mark_runs.stage_timings is
  'Elapsed ms per marking stage, keyed by MarkProgressStage. The stage the run ended in is included. Null on rows written before per-stage timing existed.';

-- Whether the student was still on the page when the result was ready. This is
-- the population the mark-ready email exists for, and the honest denominator
-- for "how often does the wait actually lose them".
alter table public.mark_runs
  add column if not exists client_disconnected boolean not null default false;

comment on column public.mark_runs.client_disconnected is
  'True when the SSE client had gone before the result was sent — the mark still completed server-side and was emailed instead.';

-- 2. Predicted score -----------------------------------------------------------
-- Asked during the wait, before the student sees the mark. The gap between this
-- and marks_earned is the self-assessment calibration signal.
alter table public.attempts
  add column if not exists predicted_marks integer
    check (predicted_marks is null or predicted_marks >= 0);

comment on column public.attempts.predicted_marks is
  'What the student predicted they would score, captured during the marking wait and submitted with the result. Null when they skipped or never saw the prompt.';

-- The same prediction, parked on the run.
--
-- It is asked during the wait, which is before the attempt row exists — there is
-- nothing yet to hang it on. The run is the only identifier both sides hold at
-- that moment, so the prediction lands here and is copied onto the attempt when
-- the mark completes. That also makes it survive the student leaving, which is
-- exactly when the mark-ready email wants to quote it back.
alter table public.mark_runs
  add column if not exists predicted_marks integer
    check (predicted_marks is null or predicted_marks >= 0);

comment on column public.mark_runs.predicted_marks is
  'Score the student predicted during the wait, before seeing the mark. Copied to attempts.predicted_marks on completion.';

-- 3. Mark-ready email preference ----------------------------------------------
-- Defaults on: it only fires when the student has already left a mark running,
-- which is exactly when they asked for it implicitly.
alter table public.user_profiles
  add column if not exists email_mark_ready boolean not null default true;

comment on column public.user_profiles.email_mark_ready is
  'Send "your mark is ready" when a mark finishes after the student closed the tab. Defaults true; honoured by lib/email/mark-ready.ts.';

-- 4. Stage timing rollup -------------------------------------------------------
-- The view the latency work is steered by: which stage actually costs the wait.
create or replace view public.mark_run_stage_timings
with (security_invoker = true) as
select
  stage.key as stage,
  count(*) as runs,
  round(avg((stage.value)::numeric) / 1000.0, 1) as avg_seconds,
  round(
    (percentile_cont(0.5) within group (
      order by (stage.value)::numeric
    ))::numeric / 1000.0,
    1
  ) as p50_seconds,
  round(
    (percentile_cont(0.9) within group (
      order by (stage.value)::numeric
    ))::numeric / 1000.0,
    1
  ) as p90_seconds,
  round(sum((stage.value)::numeric) / 1000.0) as total_seconds
from public.mark_runs mr
cross join lateral jsonb_each_text(mr.stage_timings) as stage(key, value)
where mr.stage_timings is not null
  and mr.status = 'success'
group by stage.key
order by avg_seconds desc;

comment on view public.mark_run_stage_timings is
  'Where the marking wait actually goes, per stage, across successful runs. Ordered by average cost so the most expensive stage is the first row.';

create index if not exists mark_runs_disconnected_idx
  on public.mark_runs (started_at desc)
  where client_disconnected;
