-- creator_stats v2: count answers from attempts, not from mark runs.
--
-- Two paths write marks without a mark_runs row or with several answers per
-- row: the whole-paper flow (/api/mark/whole-paper/init) never opens a run,
-- and a multi-question script is one run but one attempt per question.
-- "Answers marked" is what a creator's page promises, and an attempt with a
-- total is exactly one marked answer. `runs` stays what it was: runs opened.

create or replace function public.creator_stats(p_creator_id uuid default null)
returns table (
  user_id uuid,
  code text,
  runs bigint,
  marked bigint,
  marked_this_month bigint,
  guest_answers bigint,
  students bigint,
  joined bigint,
  gift_claimed_this_month bigint
)
language sql
stable
as $$
  select
    c.user_id,
    c.code,
    coalesce(r.runs, 0),
    coalesce(a.marked, 0),
    coalesce(a.marked_this_month, 0),
    coalesce(a.guest_answers, 0),
    coalesce(a.students, 0),
    coalesce(j.joined, 0),
    coalesce(g.gift_claimed, 0)
  from public.creators c
  left join lateral (
    select count(*) as runs
    from public.mark_runs m
    where m.creator_code = c.code
  ) r on true
  left join lateral (
    select
      count(*) as marked,
      count(*) filter (where t.created_at >= date_trunc('month', now())) as marked_this_month,
      count(*) filter (where t.user_id is null) as guest_answers,
      count(distinct t.user_id) as students
    from public.attempts t
    where t.creator_code = c.code
      -- A whole-paper job inserts its attempt before marking finishes, with
      -- no total; it becomes an answer when the total lands.
      and t.total_marks > 0
  ) a on true
  left join lateral (
    select count(*) as joined
    from public.user_profiles p
    where p.referred_by = c.user_id
  ) j on true
  left join lateral (
    select coalesce(sum(k.marks_granted), 0) as gift_claimed
    from public.creator_code_claims k
    where k.creator_id = c.user_id
      and k.claimed_at >= date_trunc('month', now())
  ) g on true
  where (p_creator_id is null and c.status = 'active')
     or c.user_id = p_creator_id
$$;

revoke execute on function public.creator_stats(uuid) from public, anon, authenticated;
