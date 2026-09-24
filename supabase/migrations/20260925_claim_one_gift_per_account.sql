-- One creator gift per account, ever.
--
-- claim_creator_code was keyed on (creator, user), so an account could apply
-- every public code in turn and be paid each creator's gift while only the
-- first creator got the attribution (user_profiles.referred_by is written
-- once). The gift follows the attribution: the first creator's code pays,
-- later codes still stamp the student's runs for that creator's counters but
-- pay nothing. Checked inside the same row-locked function so it cannot race.

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

  -- Any earlier claim, for any creator: this account has had its gift.
  if exists (
    select 1 from public.creator_code_claims k
     where k.user_id = p_user_id
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

-- The uniqueness the function now enforces, as a constraint too: one claim
-- row per account. (creator, user) stays unique by implication.
create unique index if not exists creator_code_claims_one_per_user_uidx
  on public.creator_code_claims (user_id);
