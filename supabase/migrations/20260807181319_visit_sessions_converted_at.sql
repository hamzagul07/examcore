-- Fix `visit_sessions.converted_at`.
--
-- It was only ever stamped on the UPDATE branch of the upsert, when a session
-- that began anonymous later showed a user. A session that was signed in on its
-- very first pageview took the INSERT branch, which set `user_id` but left
-- `converted_at` null — so the column disagreed with `user_id` and could not be
-- used to date a conversion. Observed on live rows before this fix.
--
-- It now means one thing on both paths: the moment a signed-in user was first
-- seen on this session.

create or replace function public.record_page_event(
  p_session_id   text,
  p_path         text,
  p_user_id      uuid    default null,
  p_referrer     text    default null,
  p_dwell_ms     integer default 0,
  p_utm_source   text    default null,
  p_utm_medium   text    default null,
  p_utm_campaign text    default null,
  p_utm_content  text    default null,
  p_utm_term     text    default null,
  p_session_cap  integer default 300
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_host  text;
begin
  if p_session_id is null or length(p_session_id) < 8 then
    return false;
  end if;

  select count(*) into v_count
    from public.page_events
   where session_id = p_session_id
     and created_at >= date_trunc('day', now());

  if v_count >= p_session_cap then
    return false;
  end if;

  v_host := nullif(lower(split_part(split_part(regexp_replace(coalesce(p_referrer, ''), '^https?://', ''), '/', 1), ':', 1)), '');

  insert into public.visit_sessions as vs (
    session_id, landing_path, referrer, referrer_host,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    channel, user_id, converted_at, pageviews
  )
  values (
    p_session_id, p_path, nullif(p_referrer, ''), v_host,
    nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''),
    nullif(p_utm_content, ''), nullif(p_utm_term, ''),
    public.classify_channel(v_host, p_utm_source, p_utm_medium),
    p_user_id,
    -- Stamped here too, so a session that arrives already signed in is dated
    -- rather than silently left null.
    case when p_user_id is not null then now() else null end,
    1
  )
  on conflict (session_id) do update set
    last_seen_at = now(),
    pageviews    = vs.pageviews + 1,
    user_id      = coalesce(vs.user_id, excluded.user_id),
    converted_at = case
                     when vs.user_id is null and excluded.user_id is not null then now()
                     else vs.converted_at
                   end;

  insert into public.page_events (user_id, session_id, path, referrer, dwell_ms)
  values (p_user_id, p_session_id, p_path, p_referrer, greatest(0, coalesce(p_dwell_ms, 0)));

  return true;
end;
$$;

revoke all on function public.record_page_event(text, text, uuid, text, integer, text, text, text, text, text, integer) from anon, authenticated;

-- Backfill the rows already written with the inconsistency. first_seen_at is
-- the closest honest value: the session was signed in from the start.
update public.visit_sessions
   set converted_at = first_seen_at
 where user_id is not null
   and converted_at is null;
