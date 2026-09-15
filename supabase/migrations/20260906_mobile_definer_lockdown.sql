-- Lock down SECURITY DEFINER surface (adversarial-review finding): default
-- PUBLIC execute grants let any anon-key caller invoke push_to_user directly
-- (arbitrary push spam) and probe the block graph via dm_is_blocked. Also
-- forces server-side DM timestamps and a monotonic thread bump.
-- Applied to production 2026-09-06 via MCP (mobile_definer_lockdown).
-- See the MCP migration of the same name for the full statements:
revoke execute on function public.push_to_user(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.notifications_push() from public, anon, authenticated;
revoke execute on function public.mark_runs_push() from public, anon, authenticated;
revoke execute on function public.dm_message_after_insert() from public, anon, authenticated;
revoke execute on function public.dm_open_thread(uuid) from public, anon;
revoke execute on function public.dm_inbox() from public, anon;
revoke execute on function public.dm_mark_read(uuid) from public, anon;
revoke execute on function public.dm_is_blocked(uuid, uuid) from public, anon;
create or replace function public.dm_is_blocked(person_a uuid, person_b uuid)
returns boolean language sql security definer set search_path = public as $$
  select case
    when auth.uid() is null or (auth.uid() <> person_a and auth.uid() <> person_b) then true
    else exists (
      select 1 from public.community_blocks
      where (user_id = person_a and blocked_user_id = person_b)
         or (user_id = person_b and blocked_user_id = person_a)
    )
  end;
$$;
create or replace function public.dm_message_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  return new;
end $$;
drop trigger if exists trg_dm_messages_stamp on public.dm_messages;
create trigger trg_dm_messages_stamp
  before insert on public.dm_messages
  for each row execute function public.dm_message_before_insert();
revoke execute on function public.dm_message_before_insert() from public, anon, authenticated;
create or replace function public.dm_message_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  sender_name text;
begin
  select case when new.sender_id = t.user_a then t.user_b else t.user_a end
    into recipient from public.dm_threads t where t.id = new.thread_id;
  update public.dm_threads
  set last_message_at = greatest(last_message_at, new.created_at),
      last_message_preview = left(new.body, 80),
      last_sender_id = new.sender_id
  where id = new.thread_id;
  if recipient is not null then
    select username into sender_name from public.user_profiles where id = new.sender_id;
    perform public.push_to_user(
      recipient,
      coalesce(sender_name, 'New message'),
      left(new.body, 120),
      jsonb_build_object('kind', 'dm', 'thread_id', new.thread_id)
    );
  end if;
  return new;
end $$;
