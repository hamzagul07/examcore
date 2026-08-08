-- Search Console rows + site-search mining for the SEO opportunity engine.

create table if not exists public.gsc_rows (
  id bigserial primary key,
  query text not null,
  page text not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  ctr numeric,
  position numeric,
  country text,
  device text,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists gsc_rows_date_idx on public.gsc_rows (date desc);
create index if not exists gsc_rows_query_idx on public.gsc_rows (query);
create index if not exists gsc_rows_page_idx on public.gsc_rows (page);
create unique index if not exists gsc_rows_unique_day
  on public.gsc_rows (date, query, page, country, device);

alter table public.gsc_rows enable row level security;

create table if not exists public.site_searches (
  id bigserial primary key,
  search_query text not null,
  results_count integer,
  clicked_result text,
  user_type text,
  path text,
  created_at timestamptz not null default now()
);

create index if not exists site_searches_created_at_idx on public.site_searches (created_at desc);
create index if not exists site_searches_query_idx on public.site_searches (search_query);

alter table public.site_searches enable row level security;

create table if not exists public.seo_page_drafts (
  id uuid primary key default gen_random_uuid(),
  concept text not null,
  subject_code text,
  grade_level text,
  prerequisites text[] not null default '{}',
  draft jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'rejected')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seo_page_drafts enable row level security;

comment on table public.gsc_rows is 'Weekly Google Search Console query/page performance ingest.';
comment on table public.site_searches is 'First-party / Omni search queries for content opportunity mining.';
comment on table public.seo_page_drafts is 'Editor-gated SEO page generator drafts — never auto-published.';
