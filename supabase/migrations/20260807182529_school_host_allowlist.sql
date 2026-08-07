-- Recover the schools that education-TLD detection cannot see.
--
-- Detection was tightened to education TLDs only, because substring matching on
-- school/college/academy classified khanacademy.org and a news site as schools
-- and inflated the campaign KPI. The cost of that precision is real: plenty of
-- independent schools sit on vanity domains (harrowschool.org.uk), and those now
-- read as ordinary referrals.
--
-- The fix is an allowlist rather than a cleverer pattern, because we already
-- know which domains are schools — they are the ones being written to. The
-- outreach table carries each school's website, so the list maintains itself.

create table if not exists public.school_hosts (
  host       text primary key,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.school_hosts enable row level security;
revoke all on public.school_hosts from anon, authenticated;

-- `stable` rather than `immutable` now that it reads a table. Still safe to call
-- from the insert path; it is only ever evaluated once per row there.
create or replace function public.is_school_host(p_host text)
returns boolean
language sql
stable
as $$
  select p_host is not null and (
    -- Education TLDs: a commercial site cannot obtain these.
    p_host like '%.sch.uk'
    or p_host like '%.ac.uk'
    or p_host = 'edu'
    or p_host like '%.edu'
    or p_host like '%.edu.%'
    or p_host like '%.ac.%'
    or p_host like '%.k12.%'
    or p_host like '%.sch.%'
    or p_host like '%.school.%'
    -- Known schools on vanity domains, learned from outreach_targets.
    or exists (
      select 1 from public.school_hosts sh
       where sh.host = p_host
          or p_host like '%.' || sh.host
    )
  );
$$;

create or replace function public.classify_channel(
  p_host text,
  p_utm_source text,
  p_utm_medium text
)
returns text
language sql
stable
as $$
  select case
    when lower(p_utm_medium) in ('email', 'newsletter') then 'email'
    when lower(p_utm_medium) in ('cpc', 'ppc', 'paid', 'paid_social') then 'paid'
    when lower(p_utm_source) like 'school-%' or lower(p_utm_medium) = 'school' then 'school'
    when lower(p_utm_medium) in ('social', 'video') then 'social'
    when p_host is null or p_host = '' then 'direct'
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

-- `channel` is written once, at insert. A school added to the allowlist later
-- would otherwise leave its earlier visits misfiled, so past rows are
-- recomputed on demand.
create or replace function public.reclassify_visit_sessions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.visit_sessions vs
     set channel = public.classify_channel(vs.referrer_host, vs.utm_source, vs.utm_medium)
   where channel is distinct from
         public.classify_channel(vs.referrer_host, vs.utm_source, vs.utm_medium);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.reclassify_visit_sessions() from anon, authenticated;

comment on table public.school_hosts is
  'Schools on non-education TLDs, so their referrals count toward the outreach KPI. Populated from outreach_targets.website by `pnpm outreach import`.';
