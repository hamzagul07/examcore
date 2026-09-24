-- Creators: two plain functions the service role calls (docs/CREATORS_PROGRAM.md).
--
-- claim_creator_code: the gift pool is a real cost (each mark is 3-4 Gemini
-- Pro calls), and the first version computed "pool left" in the app before
-- inserting the claim row, so a burst of claims at the end of a month could
-- all read the same total and each be paid in full. The row lock on the
-- creator serialises claims per creator; the arithmetic and the insert
-- happen under it.
--
-- creator_stats: the directory used to fan out seven queries per creator;
-- one grouped query serves both /creators and a single studio.
--
-- Neither is SECURITY DEFINER — they run as the caller, and the service role
-- is the only role with any privilege on these tables. Execute is revoked
-- from clients anyway.

create or replace function public.claim_creator_code(
  p_creator_id uuid,
  p_user_id uuid
)
returns table (status text, marks_granted integer)
language plpgsql
as $$
declare
  v_code text;
  v_status text;
  v_gift integer;
  v_pool integer;
  v_claimed integer;
  v_marks integer;
begin
  select c.code, c.status, c.gift_marks, c.gift_pool_monthly
    into v_code, v_status, v_gift, v_pool
    from public.creators c
   where c.user_id = p_creator_id
     for update;

  if not found or v_status <> 'active' then
    return query select 'invalid'::text, 0;
    return;
  end if;

  if p_creator_id = p_user_id then
    return query select 'self'::text, 0;
    return;
  end if;

  if exists (
    select 1 from public.creator_code_claims k
     where k.creator_id = p_creator_id and k.user_id = p_user_id
  ) then
    return query select 'already'::text, 0;
    return;
  end if;

  select coalesce(sum(k.marks_granted), 0)
    into v_claimed
    from public.creator_code_claims k
   where k.creator_id = p_creator_id
     and k.claimed_at >= date_trunc('month', now());

  v_marks := least(v_gift, greatest(0, v_pool - v_claimed));

  insert into public.creator_code_claims (creator_id, code, user_id, marks_granted)
  values (p_creator_id, v_code, p_user_id, v_marks);

  return query
    select (case when v_marks > 0 then 'granted' else 'exhausted' end)::text, v_marks;
end;
$$;

revoke execute on function public.claim_creator_code(uuid, uuid) from public, anon, authenticated;

-- Per-creator counts. With no argument: every active creator (the
-- directory). With one: that creator whatever its status (the studio).
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
    coalesce(r.marked, 0),
    coalesce(r.marked_this_month, 0),
    coalesce(r.guest_answers, 0),
    coalesce(r.students, 0),
    coalesce(j.joined, 0),
    coalesce(g.gift_claimed, 0)
  from public.creators c
  left join lateral (
    select
      count(*) as runs,
      count(*) filter (where m.status = 'success') as marked,
      count(*) filter (
        where m.status = 'success' and m.started_at >= date_trunc('month', now())
      ) as marked_this_month,
      count(*) filter (where m.status = 'success' and m.user_id is null) as guest_answers,
      count(distinct m.user_id) filter (where m.status = 'success') as students
    from public.mark_runs m
    where m.creator_code = c.code
  ) r on true
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
