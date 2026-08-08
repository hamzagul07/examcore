# Board conversion metrics (north-star)

**North star:** marked answers per organic visitor, by board — then mark → Pro by board.

Requires migration `20260809_mark_runs_exam_system.sql` applied.

---

## What is instrumented

| Surface | Board dimension |
|---------|-----------------|
| `mark_runs.exam_system` | Set from `/mark` picker (`exam_system` FormData) or derived from `subject_code` |
| Funnel beacons | Path `/__funnel/{event}/{board}` in `page_events` (e.g. `/__funnel/answer_submitted/edexcel`) |
| GA4 | `board` property on funnel events |
| Session memory | `sessionStorage.ms_funnel_last_board` so signup/upgrade after mark still tags board |

Live marking boards: `cambridge` · `ib` · `edexcel`.

---

## Weekly scorecard SQL

```sql
-- 1. Mark volume + success by board (7d)
select
  coalesce(exam_system, 'unknown') as board,
  count(*) as runs,
  count(*) filter (where status = 'success') as succeeded,
  round(100.0 * count(*) filter (where status = 'success') / nullif(count(*), 0), 1)
    as success_rate_pct
from mark_runs
where started_at > now() - interval '7 days'
group by 1
order by runs desc;

-- Or use the view:
select * from mark_run_daily_by_board
where day >= current_date - 14
order by day desc, exam_system;

-- 2. Funnel events by board (from path suffix)
select
  split_part(path, '/', 3) as event,
  nullif(split_part(path, '/', 4), '') as board,
  count(*) as events
from page_events
where path like '/__funnel/%'
  and created_at > now() - interval '7 days'
group by 1, 2
order by 1, events desc;

-- 3. Mark → signup proxy (same session marked then signed up)
-- Requires visit_sessions.user_id / converted_at plumbing from growth plan.
with marked as (
  select distinct session_id
  from page_events
  where path like '/__funnel/mark_result_viewed/%'
    and created_at > now() - interval '30 days'
),
signed as (
  select distinct session_id
  from page_events
  where path like '/__funnel/signup_completed/%'
     or path like '/__funnel/signup_completed'
    and created_at > now() - interval '30 days'
)
select
  split_part(pe.path, '/', 4) as board,
  count(distinct pe.session_id) as marked_sessions,
  count(distinct pe.session_id) filter (where s.session_id is not null) as also_signed_up
from page_events pe
join marked m on m.session_id = pe.session_id
left join signed s on s.session_id = pe.session_id
where pe.path like '/__funnel/mark_result_viewed/%'
  and pe.created_at > now() - interval '30 days'
group by 1
order by marked_sessions desc;
```

---

## Expansion gates (from BOARD_EXPANSION_ENGINE)

Do not open UK boards until roughly:

| Gate | Threshold |
|------|-----------|
| Demand | ≥ 10k non-CAIE organic sessions/mo **or** ≥ 1k Edexcel mark attempts/mo |
| Mark → account | Edexcel within ~20% of CAIE |
| Free → paid | Edexcel within ~25–30% of CAIE |

### Snapshot 2026-08-09 (7d)

| Metric | Value |
|--------|-------|
| Edexcel marks | **0** (all-time mark_runs.exam_system=edexcel also 0) |
| Cambridge marks | 1 (7d) |
| `/edexcel*` pageviews | **0** |
| Funnel `/__funnel/*/edexcel` | **0** |
| Closest edexcel-named traffic | `/blog/cambridge-vs-edexcel-vs-aqa` only (not yet the new IAL guides) |
| Live SEO cluster | UMS + past papers + marking + WMA11 guides **READY** on production; IndexNow re-pinged after go-live |

**Verdict:** hold new dialects; distribution (Results Day ops + Reddit) must send IAL traffic to the live guides — chrome/SEO alone hasn't moved `/edexcel` yet.

---

## Apply migration

```bash
# local / linked project
npx supabase db push
# or apply the SQL file in the Supabase SQL editor
```

Until the column exists, `openMarkRun` insert of `exam_system` may warn and the run still marks (telemetry is best-effort). Prefer applying the migration before shipping E2 traffic.
