-- Mobile app compliance: report reddit-style posts/comments + user blocking.
-- Applied to production 2026-09-06 via MCP (mobile_report_posts_and_user_blocks);
-- this file mirrors it for the repo's migration history.

-- Reports were constrained to the older Q&A content types; posts and
-- comments are reportable too (App Store UGC requirement).
alter table public.community_reports
  drop constraint community_reports_target_type_check;
alter table public.community_reports
  add constraint community_reports_target_type_check
  check (target_type in ('note', 'question', 'answer', 'post', 'comment'));

-- One report per reporter per target (dedupes direct client inserts).
create unique index if not exists uq_community_reports_reporter_target
  on public.community_reports (reporter_id, target_type, target_id)
  where reporter_id is not null;

-- User blocking. Rows are private to the blocker; filtering is applied by
-- the clients that read them (mobile hides blocked authors' content).
create table if not exists public.community_blocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  constraint community_blocks_not_self check (user_id <> blocked_user_id)
);
alter table public.community_blocks enable row level security;
create policy "read own blocks" on public.community_blocks
  for select using ((select auth.uid()) = user_id);
create policy "create own blocks" on public.community_blocks
  for insert with check ((select auth.uid()) = user_id);
create policy "remove own blocks" on public.community_blocks
  for delete using ((select auth.uid()) = user_id);
