-- Mobile push notifications: device tokens + DB triggers that deliver via
-- the Expo Push API (async HTTP through pg_net, fire-and-forget).
-- Applied to production 2026-09-06 via MCP (mobile_push_tokens_and_triggers);
-- this file mirrors it for the repo's migration history.

create extension if not exists pg_net;

create table if not exists public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;
create policy "read own push tokens" on public.push_tokens
  for select using ((select auth.uid()) = user_id);
create policy "register own push tokens" on public.push_tokens
  for insert with check ((select auth.uid()) = user_id);
create policy "refresh own push tokens" on public.push_tokens
  for update using ((select auth.uid()) = user_id);
create policy "remove own push tokens" on public.push_tokens
  for delete using ((select auth.uid()) = user_id);

-- Sends one push per registered device of a user. SECURITY DEFINER so the
-- triggers below can read push_tokens regardless of the inserting role.
create or replace function public.push_to_user(
  target_user uuid,
  push_title text,
  push_body text,
  push_data jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  device record;
begin
  for device in select token from public.push_tokens where user_id = target_user loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'to', device.token,
        'title', push_title,
        'body', push_body,
        'data', coalesce(push_data, '{}'::jsonb),
        'sound', 'default'
      )
    );
  end loop;
end
$$;

-- Community notifications (replies, upvotes, mentions) → push.
create or replace function public.notifications_push() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform public.push_to_user(
    new.user_id,
    new.title,
    coalesce(new.body, ''),
    jsonb_build_object('kind', 'community', 'href', new.href)
  );
  return new;
end
$$;
drop trigger if exists trg_notifications_push on public.notifications;
create trigger trg_notifications_push
  after insert on public.notifications
  for each row execute function public.notifications_push();

-- Marking finished → push, only on the transition into success for a
-- signed-in user (guests have no tokens; email already covers everyone).
create or replace function public.mark_runs_push() returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  earned int;
  total int;
begin
  if new.user_id is null or new.status <> 'success' or old.status = 'success' then
    return new;
  end if;
  if new.attempt_id is not null then
    select a.marks_earned, a.total_marks into earned, total
    from public.attempts a where a.id = new.attempt_id;
  end if;
  perform public.push_to_user(
    new.user_id,
    'Your marks are ready',
    case
      when earned is not null and total is not null
        then 'You scored ' || earned || '/' || total || '. Open the app for the breakdown.'
      else 'Marking finished — open the app to see your feedback.'
    end,
    jsonb_build_object('kind', 'marking')
  );
  return new;
end
$$;
drop trigger if exists trg_mark_runs_push on public.mark_runs;
create trigger trg_mark_runs_push
  after update of status on public.mark_runs
  for each row execute function public.mark_runs_push();
