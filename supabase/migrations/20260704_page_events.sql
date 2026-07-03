-- Lightweight first-party page-visit tracking for signed-in users, powering a
-- daily admin "visitor journeys" digest email. One row per page view with the
-- (visibility-aware, approximate) active time spent on that page.
--
-- RLS enabled with ZERO policies: writes come from the /api/track route and the
-- digest cron using the service-role client (which bypasses RLS). Same pattern
-- as stripe_webhook_events / polar_webhook_events.

create table if not exists public.page_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  path text not null,
  referrer text,
  dwell_ms integer not null default 0 check (dwell_ms >= 0),
  created_at timestamptz default now()
);

-- Digest groups by user over a day window.
create index if not exists idx_page_events_user_created
  on public.page_events (user_id, created_at desc);
create index if not exists idx_page_events_created
  on public.page_events (created_at);

alter table public.page_events enable row level security;
