-- Results Day / mock-pack email capture. Opt-in only; not an account.
create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'results-2026',
  syllabus_code text,
  raw_mark numeric,
  predicted_grade text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint marketing_leads_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- Emails are stored lowercased by the API; unique per source list.
create unique index if not exists marketing_leads_email_source_uidx
  on public.marketing_leads (email, source);

create index if not exists marketing_leads_created_at_idx
  on public.marketing_leads (created_at desc);

alter table public.marketing_leads enable row level security;

-- Service role only; no public read/write via anon key.
comment on table public.marketing_leads is
  'Opt-in email leads from Results Day tools and mock-pack capture.';
