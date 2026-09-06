-- Personal chat (DMs) for the mobile app. Clients talk to these tables
-- directly under RLS; usernames and thread creation go through narrow
-- SECURITY DEFINER RPCs; new messages bump the thread and push via the
-- existing push_to_user pipeline.
-- Applied to production 2026-09-06 via MCP (mobile_direct_messages).

create table if not exists public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  a_last_read_at timestamptz not null default now(),
  b_last_read_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  last_sender_id uuid,
  created_at timestamptz not null default now(),
  constraint dm_threads_ordered_pair check (user_a < user_b),
  unique (user_a, user_b)
);

create table if not exists public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists idx_dm_messages_thread_created
  on public.dm_messages (thread_id, created_at desc);

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

-- Either direction of a community block forbids messaging.
create or replace function public.dm_is_blocked(person_a uuid, person_b uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.community_blocks
    where (user_id = person_a and blocked_user_id = person_b)
       or (user_id = person_b and blocked_user_id = person_a)
  );
$$;

create policy "participants read threads" on public.dm_threads
  for select using ((select auth.uid()) in (user_a, user_b));
-- No direct insert/update/delete: threads are created by dm_open_thread and
-- maintained by the message trigger / dm_mark_read.

create policy "participants read messages" on public.dm_messages
  for select using (exists (
    select 1 from public.dm_threads t
    where t.id = thread_id and (select auth.uid()) in (t.user_a, t.user_b)
  ));
create policy "participants send messages" on public.dm_messages
  for insert with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.dm_threads t
      where t.id = thread_id
        and (select auth.uid()) in (t.user_a, t.user_b)
        and not public.dm_is_blocked(t.user_a, t.user_b)
    )
  );

-- Find-or-create the thread with another user (blocks forbid it).
create or replace function public.dm_open_thread(other_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  a uuid; b uuid; thread uuid;
begin
  if me is null then raise exception 'Sign in to send messages.'; end if;
  if other_user is null or other_user = me then raise exception 'Pick a person to message.'; end if;
  if public.dm_is_blocked(me, other_user) then raise exception 'You cannot message this user.'; end if;
  a := least(me, other_user); b := greatest(me, other_user);
  insert into public.dm_threads (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do nothing;
  select id into thread from public.dm_threads where user_a = a and user_b = b;
  return thread;
end $$;

-- Inbox with counterpart usernames (public handles shown on every post).
create or replace function public.dm_inbox()
returns table (
  thread_id uuid,
  other_id uuid,
  other_username text,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  my_last_read_at timestamptz
) language sql security definer set search_path = public as $$
  select
    t.id,
    case when t.user_a = auth.uid() then t.user_b else t.user_a end,
    p.username,
    t.last_message_at,
    t.last_message_preview,
    t.last_sender_id,
    case when t.user_a = auth.uid() then t.a_last_read_at else t.b_last_read_at end
  from public.dm_threads t
  left join public.user_profiles p
    on p.id = case when t.user_a = auth.uid() then t.user_b else t.user_a end
  where auth.uid() in (t.user_a, t.user_b)
    and not exists (
      select 1 from public.community_blocks cb
      where cb.user_id = auth.uid()
        and cb.blocked_user_id = case when t.user_a = auth.uid() then t.user_b else t.user_a end
    )
  order by t.last_message_at desc;
$$;

create or replace function public.dm_mark_read(thread uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.dm_threads
  set a_last_read_at = case when user_a = auth.uid() then now() else a_last_read_at end,
      b_last_read_at = case when user_b = auth.uid() then now() else b_last_read_at end
  where id = thread and auth.uid() in (user_a, user_b);
end $$;

-- New message: bump the thread and push to the recipient.
create or replace function public.dm_message_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  recipient uuid;
  sender_name text;
begin
  select case when new.sender_id = t.user_a then t.user_b else t.user_a end
    into recipient from public.dm_threads t where t.id = new.thread_id;
  update public.dm_threads
  set last_message_at = new.created_at,
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
drop trigger if exists trg_dm_messages_push on public.dm_messages;
create trigger trg_dm_messages_push
  after insert on public.dm_messages
  for each row execute function public.dm_message_after_insert();

-- Live delivery to open chat screens.
alter publication supabase_realtime add table public.dm_messages;
