-- Make the top of the funnel visible.
--
-- `/api/track` dropped every request without a session (`if (!user) return`),
-- and `page_events.user_id` was NOT NULL, so anonymous visitors could not be
-- recorded even in principle. Every funnel measurement therefore began at
-- onboarding — i.e. AFTER signup — which is the same blind spot `mark_runs`
-- fixed for marking: the instrument only recorded people who already converted.
-- With ~3k SEO pages, the visitor→signup step is likely the largest absolute
-- leak in the product and there was no data on it at all.

alter table public.page_events
  alter column user_id drop not null;

-- Opaque, random, session-scoped id generated client-side and held in
-- sessionStorage. Deliberately NOT an IP, device fingerprint or persistent
-- cookie: it dies with the tab, so it answers "did THIS visit convert?" without
-- building a durable identifier for a person.
alter table public.page_events
  add column if not exists session_id text;

create index if not exists page_events_session_idx
  on public.page_events (session_id, created_at desc)
  where session_id is not null;

-- Anonymous rows are the point of this change, but they're also the ones we
-- most often want to exclude from per-user rollups.
create index if not exists page_events_anon_idx
  on public.page_events (created_at desc)
  where user_id is null;

comment on column public.page_events.session_id is
  'Random session-scoped id from sessionStorage. Not an IP or fingerprint; not stable across tabs or visits. Links an anonymous visit to the signup it produced.';

/**
 * Record one page view, enforcing a per-session daily cap in the same
 * round-trip as the insert.
 *
 * Opening /api/track to anonymous traffic makes it a public write endpoint. A
 * read-then-write rate limit would double the DB ops on the highest-volume
 * endpoint in the app, so the cap is folded into the insert instead: one call,
 * atomic, and it counts against the session id so no IP is ever stored.
 * Returns true when the row was written.
 */
create or replace function public.record_page_event(
  p_session_id text,
  p_path text,
  p_user_id uuid default null,
  p_referrer text default null,
  p_dwell_ms integer default 0,
  p_session_cap integer default 300
) returns boolean
language plpgsql
security invoker
as $$
declare
  v_count integer;
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

  insert into public.page_events (user_id, session_id, path, referrer, dwell_ms)
  values (p_user_id, p_session_id, p_path, p_referrer, greatest(0, coalesce(p_dwell_ms, 0)));

  return true;
end;
$$;

-- Service role only — the track route uses the service client. Never grant this
-- to anon/authenticated: a table-wide grant is exactly how the mark_feedback
-- self-approval hole happened.
revoke all on function public.record_page_event(text, text, uuid, text, integer, integer) from public, anon, authenticated;

comment on function public.record_page_event is
  'Insert a page_events row with a per-session daily cap enforced in the same round-trip. Service-role only.';
