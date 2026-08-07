-- Visit attribution.
--
-- Every one of the ~3,000 pageviews recorded in the 30 days to 2026-08-07 was
-- unattributable: `page_events.referrer` was either null or an *internal* path,
-- because the client tracker only ever sent the previously-viewed route and
-- never read `document.referrer`. No campaign could be measured, so no channel
-- could be judged.
--
-- Attribution is a property of a *session*, not of a pageview: where someone
-- came from is decided once, on the landing page, and every later pageview in
-- that session inherits it. So it lives in its own table keyed by session_id
-- rather than being copied onto every row of page_events.

-- ---------------------------------------------------------------------------
-- Channel classification
-- ---------------------------------------------------------------------------

-- Which host is a school? Deliberately its own channel rather than being
-- lumped into 'referral': a link from a school's department resources page is
-- the single signal the teacher-outreach strategy exists to produce, and it
-- needs to be countable on its own.
create or replace function public.is_school_host(p_host text)
returns boolean
language sql
immutable
as $$
  select p_host is not null and (
    p_host like '%.sch.uk'
    or p_host like '%.ac.uk'
    or p_host like '%.edu'
    or p_host like '%.edu.%'
    or p_host like '%.ac.%'
    or p_host like '%.k12.%'
    or p_host like '%school%'
    or p_host like '%college%'
    or p_host like '%academy%'
  );
$$;

create or replace function public.classify_channel(
  p_host text,
  p_utm_source text,
  p_utm_medium text
)
returns text
language sql
immutable
as $$
  select case
    -- An explicit UTM always wins: it is a deliberate statement by whoever
    -- built the link, and outreach links are tagged at source.
    when lower(p_utm_medium) in ('email', 'newsletter') then 'email'
    when lower(p_utm_medium) in ('cpc', 'ppc', 'paid', 'paid_social') then 'paid'
    when lower(p_utm_source) like 'school-%' or lower(p_utm_medium) = 'school' then 'school'
    when lower(p_utm_medium) in ('social', 'video') then 'social'

    when p_host is null or p_host = '' then 'direct'

    -- AI assistants are split out from organic search. They convert and cite
    -- very differently, and the site explicitly allows GPTBot/ClaudeBot/
    -- PerplexityBot, so this measures whether that bet pays.
    when p_host ~ '(chatgpt|openai|perplexity|claude\.ai|anthropic|copilot|gemini\.google|bard\.google|you\.com|phind)'
      then 'ai-assistant'

    when p_host ~ '(google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\.|brave\.|yandex\.|baidu\.|startpage\.)'
      then 'organic'

    when p_host ~ '(tiktok|instagram|youtube|youtu\.be|reddit|discord|twitter|^t\.co$|x\.com|facebook|fb\.|linkedin|pinterest|snapchat|whatsapp|telegram|tumblr)'
      then 'social'

    when public.is_school_host(p_host) then 'school'

    else 'referral'
  end;
$$;

-- ---------------------------------------------------------------------------
-- visit_sessions — one row per browsing session, written once on first sight
-- ---------------------------------------------------------------------------

create table if not exists public.visit_sessions (
  session_id      text primary key,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  landing_path    text,
  referrer        text,
  referrer_host   text,
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text,
  channel         text not null default 'direct',
  -- Set the first time a signed-in user is seen on this session. Lets a signup
  -- be traced back to the channel that produced the landing, which is the whole
  -- point of the exercise.
  user_id         uuid references auth.users (id) on delete set null,
  converted_at    timestamptz,
  pageviews       integer not null default 0
);

create index if not exists visit_sessions_channel_idx
  on public.visit_sessions (channel, first_seen_at desc);
create index if not exists visit_sessions_first_seen_idx
  on public.visit_sessions (first_seen_at desc);
create index if not exists visit_sessions_campaign_idx
  on public.visit_sessions (utm_campaign)
  where utm_campaign is not null;
create index if not exists visit_sessions_user_idx
  on public.visit_sessions (user_id)
  where user_id is not null;

-- Service-role only, like the rest of the analytics surface. RLS protects rows,
-- not columns, so the grants are revoked outright rather than relying on a
-- policy — see the same pattern used for the other service-written tables.
alter table public.visit_sessions enable row level security;
revoke all on public.visit_sessions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- record_page_event — now also upserts the session's first-touch
-- ---------------------------------------------------------------------------

-- The previous 6-arg signature is replaced rather than overloaded: leaving both
-- in place would let PostgREST resolve to the old one and silently keep
-- dropping attribution, which is the exact failure being fixed here.
drop function if exists public.record_page_event(text, text, uuid, text, integer, integer);

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

  -- Host of the *external* referrer only. An internal referrer (same origin)
  -- is not attribution — it is navigation — and must not overwrite the
  -- first-touch that brought the visitor here.
  v_host := nullif(lower(split_part(split_part(regexp_replace(coalesce(p_referrer, ''), '^https?://', ''), '/', 1), ':', 1)), '');

  insert into public.visit_sessions as vs (
    session_id, landing_path, referrer, referrer_host,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    channel, user_id, pageviews
  )
  values (
    p_session_id, p_path, nullif(p_referrer, ''), v_host,
    nullif(p_utm_source, ''), nullif(p_utm_medium, ''), nullif(p_utm_campaign, ''),
    nullif(p_utm_content, ''), nullif(p_utm_term, ''),
    public.classify_channel(v_host, p_utm_source, p_utm_medium),
    p_user_id, 1
  )
  on conflict (session_id) do update set
    last_seen_at = now(),
    pageviews    = vs.pageviews + 1,
    -- First-touch wins. Once a session has a channel, later pageviews only
    -- ever add the user_id (the signup moment) — never rewrite the origin.
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
