-- Teacher outreach, tracked as data.
--
-- docs/OUTREACH_TRACKER.md has read "0/10" for a month. A markdown checklist
-- cannot tell you which schools replied, which produced signups, or which are
-- overdue a follow-up, so it stops being updated and the campaign becomes
-- unmeasurable. This is the same list as a table that can be joined to traffic.
--
-- The join is `utm_source`: every target gets `school-<slug>`, and
-- classify_channel() already routes `school-%` to the 'school' channel, so a
-- click from an outreach link lands in visit_sessions attributed to the school
-- it came from without any further wiring.

create table if not exists public.outreach_targets (
  id            uuid primary key default gen_random_uuid(),
  school        text not null,
  -- Stable, URL-safe identity for the school; the other half of `utm_source`.
  slug          text not null unique,
  country       text,
  -- 'ib' | 'cambridge' | 'both' — which catalogue the school came from.
  board         text,
  -- The department actually being written to; one school can be approached for
  -- more than one subject, which is why this is not unique per school.
  subject       text,
  contact_name  text,
  contact_email text,
  contact_role  text,
  website       text,

  status        text not null default 'queued'
                check (status in ('queued','sent','bounced','replied','trialing','signed_up','linked','declined')),
  sent_at       timestamptz,
  replied_at    timestamptz,
  -- Set when the school's own site links here: the outcome the whole campaign
  -- exists to produce.
  linked_at     timestamptz,
  linked_url    text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists outreach_targets_status_idx
  on public.outreach_targets (status, sent_at desc nulls last);
create index if not exists outreach_targets_board_idx
  on public.outreach_targets (board);

-- Service-role only. Contact details for named people at named schools are not
-- something any browser session should be able to read, and RLS protects rows
-- rather than columns, so the grants come off outright.
alter table public.outreach_targets enable row level security;
revoke all on public.outreach_targets from anon, authenticated;

create or replace function public.touch_outreach_target()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_outreach_target on public.outreach_targets;
create trigger trg_touch_outreach_target
  before update on public.outreach_targets
  for each row execute function public.touch_outreach_target();
