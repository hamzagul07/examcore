-- Clear the Supabase performance advisor findings on this app's own tables.
--
--   0001 unindexed_foreign_keys: every FK below is the "other side" of a
--        relationship. Deleting a user (or a poll option) has to find the
--        referencing rows, which without an index is a sequential scan of the
--        whole table per deleted row. The tables are small today, which is
--        exactly when an index is cheapest to add.
--   0003 auth_rls_initplan: max_exam_pack_cache's read policy called
--        auth.uid() per row. Wrapping it in a scalar subquery lets the planner
--        evaluate it once per statement. Same name, same roles (PUBLIC), same
--        predicate, so nothing that reads the table behaves differently.
--
-- The creator_* findings belong to the creators feature, which lives on its own
-- branch and owns its schema; they are left to it.
--
-- Idempotent: safe to re-run.

create index if not exists campaign_sends_user_id_idx
  on public.campaign_sends (user_id);
create index if not exists community_blocks_blocked_user_id_idx
  on public.community_blocks (blocked_user_id);
create index if not exists community_poll_votes_option_id_idx
  on public.community_poll_votes (option_id);
create index if not exists community_poll_votes_user_id_idx
  on public.community_poll_votes (user_id);
create index if not exists community_reactions_user_id_idx
  on public.community_reactions (user_id);
create index if not exists dm_messages_sender_id_idx
  on public.dm_messages (sender_id);
create index if not exists dm_threads_user_b_idx
  on public.dm_threads (user_b);
create index if not exists notifications_actor_id_idx
  on public.notifications (actor_id);

drop policy if exists "Users can view own max exam packs" on public.max_exam_pack_cache;
create policy "Users can view own max exam packs"
  on public.max_exam_pack_cache for select
  using ((select auth.uid()) = user_id);
