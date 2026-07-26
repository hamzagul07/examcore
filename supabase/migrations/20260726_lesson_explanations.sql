-- Per-paragraph "Explain more" cache for course lessons.
--
-- The output of this feature is deterministic per (lesson, block, intent) and
-- identical for every student who reads that paragraph, so it is cached content
-- rather than a per-user chat turn. That bounds the whole feature: ~1,859
-- lessons x ~6 note blocks x 3 intents is the entire generation space, ever.
-- After the cache warms a request is one indexed read — no model call, no quota.
--
-- `block_key` is a content hash (lib/courses/explain-block-key.ts), NOT the
-- index of the block in the lesson's notes array. Lesson JSON is regenerated
-- regularly and block order shifts; index-keyed rows would silently re-attach
-- to the wrong paragraph.

create table if not exists public.lesson_explanations (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null,
  lesson_slug text not null,
  block_key text not null,
  intent text not null check (intent in ('simpler', 'why', 'example')),
  body text not null,
  model text not null,
  -- How many times students asked for this explanation. This column IS the
  -- product signal: ranked desc it names the paragraphs the catalogue explains
  -- worst, which is what should drive the next round of rewrites and diagrams.
  request_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists lesson_explanations_key_idx
  on public.lesson_explanations (lesson_slug, block_key, intent);

create index if not exists lesson_explanations_demand_idx
  on public.lesson_explanations (request_count desc);

alter table public.lesson_explanations enable row level security;

-- Public read: shared, non-personal course content, served to guests too.
drop policy if exists "read lesson explanations" on public.lesson_explanations;
create policy "read lesson explanations" on public.lesson_explanations
  for select to anon, authenticated using (true);

-- Writes are service-role only, via /api/courses/explain.
--
-- RLS constrains ROWS, not COLUMNS. Without this revoke, Supabase's default
-- table-wide grant to `authenticated` would let any signed-in user POST
-- straight to PostgREST and plant arbitrary text in a row we then serve to
-- every reader of that lesson — the route's validation bypassed entirely.
-- TRUNCATE is included deliberately: it is a write privilege that RLS does NOT
-- constrain (policies filter rows; a truncate removes them all without
-- consulting any policy), and Supabase's default grant hands it to
-- anon/authenticated alongside the DML privileges.
revoke insert, update, delete, truncate on public.lesson_explanations
  from anon, authenticated;

comment on table public.lesson_explanations is
  'Cached per-paragraph AI explanations for course lessons. Deterministic per (lesson_slug, block_key, intent) and shared across all users. WRITES ARE SERVICE-ROLE ONLY — see /api/courses/explain.';

comment on column public.lesson_explanations.block_key is
  'Content hash of the note block (heading + prose opening), from lib/courses/explain-block-key.ts. Never a positional index.';

comment on column public.lesson_explanations.request_count is
  'Demand counter. Order by this desc to find the paragraphs students most often cannot follow.';

-- Atomic demand bump. A read-then-write from the route would lose increments
-- whenever two students tap the same paragraph at once, which is exactly the
-- case we most want counted accurately.
create or replace function public.bump_lesson_explanation_demand(
  p_lesson_slug text,
  p_block_key text,
  p_intent text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.lesson_explanations
     set request_count = request_count + 1,
         updated_at = now()
   where lesson_slug = p_lesson_slug
     and block_key = p_block_key
     and intent = p_intent;
$$;

-- Called only from the route with the service role; no end-user role needs it.
--
-- PUBLIC must be revoked explicitly: Postgres grants EXECUTE on new functions to
-- PUBLIC by default, so revoking from anon/authenticated alone would leave this
-- callable over PostgREST RPC. It is `security definer`, so an open grant would
-- let anyone inflate the demand counters — corrupting the one signal this table
-- exists to produce.
revoke execute on function public.bump_lesson_explanation_demand(text, text, text)
  from public, anon, authenticated;
