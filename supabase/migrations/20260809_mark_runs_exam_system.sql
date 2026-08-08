-- Board dimension on mark_runs (Phase E0/E2 analytics).
-- Enables north-star: marked answers / organic visitor by exam system.

alter table public.mark_runs
  add column if not exists exam_system text
    check (
      exam_system is null
      or exam_system in ('cambridge', 'ib', 'edexcel', 'oxfordaqa', 'aqa', 'ap')
    );

create index if not exists mark_runs_exam_system_started_idx
  on public.mark_runs (exam_system, started_at desc)
  where exam_system is not null;

comment on column public.mark_runs.exam_system is
  'ExamSystemId from the /mark board picker (or derived from subject_code). Primary board slice for conversion analytics.';

-- Daily rollup by board. Complements mark_run_daily_stats (all boards).
create or replace view public.mark_run_daily_by_board
with (security_invoker = true) as
select
  date_trunc('day', started_at)::date as day,
  coalesce(exam_system, 'unknown') as exam_system,
  count(*) as runs,
  count(*) filter (where status = 'success') as succeeded,
  count(*) filter (where status = 'error') as errored,
  count(*) filter (where status = 'abandoned') as abandoned,
  round(
    100.0 * count(*) filter (where status = 'success') / nullif(count(*), 0),
    1
  ) as success_rate_pct,
  round(avg(duration_ms) filter (where status = 'success') / 1000.0) as avg_success_seconds
from public.mark_runs
group by 1, 2
order by 1 desc, 2;

comment on view public.mark_run_daily_by_board is
  'Daily marking volume and success rate sliced by exam_system (cambridge/ib/edexcel/…).';
