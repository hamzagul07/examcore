-- Phase 0: marking reliability telemetry.
--
-- `attempts` rows are only written AFTER the whole pipeline succeeds, so every
-- timeout, parse failure and killed function was invisible — the DB reported a
-- 100% success rate while users reported frequent failures. `mark_runs` is
-- written at the START of a run and settled at the end, so an unsettled row is
-- itself the signal (function killed mid-flight → swept to 'abandoned').

create table if not exists public.mark_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  -- Lifecycle. 'running' rows older than the sweep window are the killed ones.
  status text not null default 'running'
    check (status in ('running', 'success', 'error', 'abandoned')),
  -- Last progress stage reached before settling — tells us WHERE it died.
  last_stage text,
  -- Request shape, so failures can be sliced by upload type.
  upload_mode text,
  mark_intent text,
  page_count integer not null default 0,
  has_pdf boolean not null default false,
  is_paid boolean not null default false,
  subject_code text,
  -- Outcome.
  attempt_id uuid,
  error_code text,
  error_message text,
  duration_ms integer,
  -- Total Gemini retries burned across the run (retry storms show up here).
  gemini_retries integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists mark_runs_started_at_idx
  on public.mark_runs (started_at desc);
create index if not exists mark_runs_status_started_idx
  on public.mark_runs (status, started_at desc);
create index if not exists mark_runs_user_idx
  on public.mark_runs (user_id, started_at desc);

-- Service-role only: the marking route writes these with the admin client and
-- nothing in the app reads them as an end user. RLS on with no policies means
-- anon/authenticated get nothing.
alter table public.mark_runs enable row level security;

comment on table public.mark_runs is
  'One row per marking attempt, written at start and settled at end. Unsettled rows past the sweep window are killed functions.';

-- Reliability rollup. Read this instead of hand-writing the funnel each time.
create or replace view public.mark_run_daily_stats
with (security_invoker = true) as
select
  date_trunc('day', started_at)::date as day,
  count(*) as runs,
  count(*) filter (where status = 'success') as succeeded,
  count(*) filter (where status = 'error') as errored,
  count(*) filter (where status = 'abandoned') as abandoned,
  round(
    100.0 * count(*) filter (where status = 'success') / nullif(count(*), 0),
    1
  ) as success_rate_pct,
  round(avg(duration_ms) filter (where status = 'success') / 1000.0) as avg_success_seconds,
  round(
    (percentile_cont(0.95) within group (order by duration_ms)
      filter (where status = 'success')) / 1000.0
  ) as p95_success_seconds
from public.mark_runs
group by 1
order by 1 desc;

comment on view public.mark_run_daily_stats is
  'Daily marking success rate and latency. Source of truth for "does marking actually work".';
