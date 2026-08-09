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
| Board hubs | `landing_view` via `FunnelLandingView` (`board_hub_edexcel` / `_oxfordaqa` / `_aqa` / `_ap`) |
| Hub + study-path CTAs | `mark_cta_clicked` with `source` + `board` (hub hero, study-path sheet/practice/checkpoint) |

Live marking boards: `cambridge` · `ib` · `edexcel` · `oxfordaqa` · `aqa` · `ap`.

Study-path → mark deep links carry `utm_source=study_path&utm_medium=lesson&utm_campaign={board}` so lesson handoffs are visible in UTM scorecards.

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

### Snapshot 2026-08-09 (7d, rechecked)

| Metric | Value |
|--------|-------|
| Edexcel marks | **0** |
| Cambridge marks | 1 (7d) |
| `/edexcel*` pageviews | **0** |
| `/blog/edexcel*` pageviews | **0** |
| Funnel `/__funnel/*/edexcel` | **0** |
| `/results-2026*` pageviews | 3 |
| Closest edexcel-named traffic | `/blog/cambridge-vs-edexcel-vs-aqa` only (2) |
| Live SEO cluster | UMS + past papers + marking + WMA11 guides live; wrong-board bridges on Results Day + will-my-grade-hold |

**Verdict:** hold new dialects. Product bridges are in place; **human posts** in [READY_TO_POST_NOW.md](./READY_TO_POST_NOW.md) are still required to move `/edexcel`.

### Snapshot 2026-08-09 afternoon (7d, full-completion baseline)

| Metric | Value |
|--------|-------|
| Edexcel marks (`mark_runs.exam_system`) | **0** |
| Cambridge marks | **5** succeeded / 5 runs |
| `/edexcel*` + `/blog/edexcel*` + funnel edexcel paths | **0** page_events |
| G1 (OxfordAQA marking) | **FAIL** on demand — product override to continue full-completion sequence |
| G2 (UK A-Level) | **FAIL** on demand — same override |

**Verdict:** conversion gates still fail. Engineering continues under explicit full-completion override; distribution in [READY_TO_POST_NOW.md](./READY_TO_POST_NOW.md) remains required for organic demand.

---

## Apply migration

```bash
# local / linked project
npx supabase db push
# or apply the SQL file in the Supabase SQL editor
```

Until the column exists, `openMarkRun` insert of `exam_system` may warn and the run still marks (telemetry is best-effort). Prefer applying the migration before shipping E2 traffic.


### G1 / G2 override (full-completion sequence)

| Gate | Result | Action |
|------|--------|--------|
| G1 OxfordAQA marking | FAIL (0 Edexcel marks) | **Override** — OxfordAQA Wave 1 marking shipped |
| G2 UK A-Level | FAIL (same) | **Override** — selective AQA + Edexcel UK AL shipped |
| AP | n/a (after UK in plan) | **Override** — Calculus AB + Physics 1 FRQ shipped |

Re-check scorecard weekly. Distribution remains the bottleneck.
