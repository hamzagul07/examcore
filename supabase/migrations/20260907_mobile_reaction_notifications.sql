-- Notify a post/comment author the first time someone reacts to their content
-- (once per reactor per target). Reuses notifications → push pipeline.
-- Applied to production 2026-09-07 via MCP (mobile_reaction_notifications).
create or replace function public.community_reaction_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  author uuid;
  reactor_name text;
  prior int;
begin
  select count(*) into prior from public.community_reactions
    where target_type = new.target_type and target_id = new.target_id and user_id = new.user_id;
  if prior > 1 then return new; end if;
  if new.target_type = 'post' then
    select author_id into author from public.community_posts where id = new.target_id;
  else
    select author_id into author from public.community_comments where id = new.target_id;
  end if;
  if author is null or author = new.user_id then return new; end if;
  select username into reactor_name from public.user_profiles where id = new.user_id;
  insert into public.notifications (user_id, type, title, body, href)
  values (
    author,
    'reaction',
    coalesce(reactor_name, 'Someone') || ' reacted to your ' || new.target_type,
    'They marked it ' || new.kind || '.',
    null
  );
  return new;
end $$;
drop trigger if exists trg_reaction_notify on public.community_reactions;
create trigger trg_reaction_notify
  after insert on public.community_reactions
  for each row execute function public.community_reaction_notify();
