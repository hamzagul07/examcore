-- Broadcast campaigns: newsletter, feature announcements, one-off sends.
--
-- Two tables rather than one because the interesting guarantee is per-recipient,
-- not per-campaign. campaign_sends carries a unique (campaign_id, user_id), so
-- "has this person already had this email?" is answered by the database rather
-- than by the sender remembering. A crashed run, a re-run, or two people
-- triggering the same campaign cannot double-send: the insert simply conflicts.
--
-- Both tables are service-role only. No RLS policies are added, and the
-- authenticated/anon grants are revoked below — a student has no reason to read
-- the campaign list, and `revoke` matters because RLS protects rows, not
-- columns, and a table with RLS enabled but no policy still honours grants made
-- to a role that bypasses nothing.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  -- Stable handle used from the CLI, so a campaign is re-runnable by name and
  -- cannot be started twice by creating a near-identical row.
  slug text not null unique,
  subject text not null,
  preheader text,
  -- Body is authored as plain text with blank-line paragraphs; the branded
  -- shell turns it into HTML. Keeping the source as text means a campaign can
  -- be proof-read in a terminal and diffed in git.
  body text not null,
  audience text not null,
  -- Optional button. cta_href supports the per-recipient placeholders
  -- {{subscribe_url}} / {{unsubscribe_url}}, substituted at delivery.
  cta_label text,
  cta_href text,
  status text not null default 'draft'
    check (status in ('draft', 'sending', 'sent', 'cancelled')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.campaign_sends (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

-- The sender's hot path: "who in this audience has not had it yet".
create index if not exists campaign_sends_campaign_idx
  on public.campaign_sends (campaign_id);

alter table public.campaigns enable row level security;
alter table public.campaign_sends enable row level security;

revoke all on public.campaigns from anon, authenticated;
revoke all on public.campaign_sends from anon, authenticated;

comment on table public.campaigns is
  'Broadcast email campaigns. Service-role only; sent via scripts/send-campaign.ts.';
comment on column public.campaigns.audience is
  'Named segment from lib/campaigns/audience.ts. Resolved at send time, not stored, so a campaign always reflects current opt-outs.';
comment on table public.campaign_sends is
  'One row per recipient per campaign. The primary key is the double-send guard.';
