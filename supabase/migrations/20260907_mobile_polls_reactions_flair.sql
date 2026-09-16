-- Reddit-parity phase: polls, reactions, and user flair.
-- Applied to production 2026-09-07 via MCP (mobile_polls_reactions_flair).

-- ============ POLLS ============
create table if not exists public.community_polls (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.community_posts(id) on delete cascade,
  closes_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.community_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.community_polls(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  position int not null default 0
);
create index if not exists idx_poll_options_poll on public.community_poll_options (poll_id, position);
create table if not exists public.community_poll_votes (
  poll_id uuid not null references public.community_polls(id) on delete cascade,
  option_id uuid not null references public.community_poll_options(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

alter table public.community_polls enable row level security;
alter table public.community_poll_options enable row level security;
alter table public.community_poll_votes enable row level security;
create policy "read polls" on public.community_polls for select using (true);
create policy "read poll options" on public.community_poll_options for select using (true);
create policy "read own poll vote" on public.community_poll_votes
  for select using ((select auth.uid()) = user_id);

create or replace function public.create_poll(p_post_id uuid, p_options text[], p_closes_at timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  owner uuid;
  new_poll uuid;
  opt text;
  idx int := 0;
begin
  if me is null then raise exception 'Sign in.'; end if;
  select author_id into owner from public.community_posts where id = p_post_id;
  if owner is null or owner <> me then raise exception 'Not your post.'; end if;
  if array_length(p_options, 1) is null or array_length(p_options, 1) < 2
     or array_length(p_options, 1) > 6 then
    raise exception 'A poll needs 2 to 6 options.';
  end if;
  insert into public.community_polls (post_id, closes_at) values (p_post_id, p_closes_at)
    returning id into new_poll;
  foreach opt in array p_options loop
    insert into public.community_poll_options (poll_id, label, position)
      values (new_poll, left(opt, 80), idx);
    idx := idx + 1;
  end loop;
  return new_poll;
end $$;

create or replace function public.vote_poll(p_option_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  p_poll uuid;
  closes timestamptz;
begin
  if me is null then raise exception 'Sign in to vote.'; end if;
  select o.poll_id, pl.closes_at into p_poll, closes
    from public.community_poll_options o
    join public.community_polls pl on pl.id = o.poll_id
    where o.id = p_option_id;
  if p_poll is null then raise exception 'Unknown option.'; end if;
  if closes is not null and closes < now() then raise exception 'This poll has closed.'; end if;
  insert into public.community_poll_votes (poll_id, option_id, user_id)
    values (p_poll, p_option_id, me)
    on conflict (poll_id, user_id) do update set option_id = excluded.option_id, created_at = now();
end $$;

create or replace function public.get_poll(p_post_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  pl record;
  result jsonb;
begin
  select * into pl from public.community_polls where post_id = p_post_id;
  if pl.id is null then return null; end if;
  select jsonb_build_object(
    'poll_id', pl.id,
    'closes_at', pl.closes_at,
    'my_option_id', (select option_id from public.community_poll_votes where poll_id = pl.id and user_id = me),
    'total', (select count(*) from public.community_poll_votes where poll_id = pl.id),
    'options', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'label', o.label, 'position', o.position,
        'votes', (select count(*) from public.community_poll_votes v where v.option_id = o.id)
      ) order by o.position)
      from public.community_poll_options o where o.poll_id = pl.id
    ), '[]'::jsonb)
  ) into result;
  return result;
end $$;

revoke execute on function public.create_poll(uuid, text[], timestamptz) from public, anon;
revoke execute on function public.vote_poll(uuid) from public, anon;

-- ============ REACTIONS ============
create table if not exists public.community_reactions (
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('helpful', 'clear', 'verified')),
  created_at timestamptz not null default now(),
  primary key (target_type, target_id, user_id, kind)
);
create index if not exists idx_reactions_target on public.community_reactions (target_type, target_id);
alter table public.community_reactions enable row level security;
create policy "read own reactions" on public.community_reactions
  for select using ((select auth.uid()) = user_id);
create policy "add own reactions" on public.community_reactions
  for insert with check ((select auth.uid()) = user_id);
create policy "remove own reactions" on public.community_reactions
  for delete using ((select auth.uid()) = user_id);

create or replace function public.get_reactions(p_target_type text, p_target_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  return jsonb_build_object(
    'counts', coalesce((
      select jsonb_object_agg(kind, c) from (
        select kind, count(*) c from public.community_reactions
        where target_type = p_target_type and target_id = p_target_id group by kind
      ) t
    ), '{}'::jsonb),
    'mine', coalesce((
      select jsonb_agg(kind) from public.community_reactions
      where target_type = p_target_type and target_id = p_target_id and user_id = me
    ), '[]'::jsonb)
  );
end $$;

-- ============ USER FLAIR ============
alter table public.user_profiles add column if not exists flair text;

create or replace function public.set_user_flair(p_flair text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sign in.'; end if;
  update public.user_profiles
    set flair = nullif(left(trim(p_flair), 24), '')
    where id = me;
end $$;
revoke execute on function public.set_user_flair(text) from public, anon;
