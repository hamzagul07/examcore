-- Follow other students. Owner-only rows; counts public via definer fn.
-- Applied to production 2026-09-07 via MCP (mobile_follows).
create table if not exists public.community_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint community_follows_not_self check (follower_id <> following_id)
);
create index if not exists idx_follows_following on public.community_follows (following_id);
create index if not exists idx_follows_follower on public.community_follows (follower_id, created_at desc);
alter table public.community_follows enable row level security;
create policy "read own follows" on public.community_follows
  for select using ((select auth.uid()) in (follower_id, following_id));
create policy "create own follow" on public.community_follows
  for insert with check ((select auth.uid()) = follower_id);
create policy "remove own follow" on public.community_follows
  for delete using ((select auth.uid()) = follower_id);
create or replace function public.get_follow_stats(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  return jsonb_build_object(
    'followers', (select count(*) from public.community_follows where following_id = p_user),
    'following', (select count(*) from public.community_follows where follower_id = p_user),
    'is_following', me is not null and exists (
      select 1 from public.community_follows where follower_id = me and following_id = p_user
    )
  );
end $$;
