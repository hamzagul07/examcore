-- Saved posts (Reddit "save"): bookmark a thread to revisit. Owner-only,
-- like community_note_saves. Applied to production 2026-09-07 via MCP
-- (mobile_post_saves).
create table if not exists public.community_post_saves (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists idx_community_post_saves_user
  on public.community_post_saves (user_id, created_at desc);
alter table public.community_post_saves enable row level security;
create policy "read own saves" on public.community_post_saves
  for select using ((select auth.uid()) = user_id);
create policy "create own saves" on public.community_post_saves
  for insert with check ((select auth.uid()) = user_id);
create policy "remove own saves" on public.community_post_saves
  for delete using ((select auth.uid()) = user_id);
