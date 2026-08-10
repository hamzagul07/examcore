-- Cache freeform (derived) mark schemes so remakes of the same question share
-- one rubric. Written/read by the marking pipeline with the service role only.

create table if not exists public.derived_mark_schemes (
  fingerprint text primary key,
  scheme jsonb not null,
  total_marks integer not null check (total_marks > 0 and total_marks <= 100),
  subject_code text,
  exam_system text,
  hit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists derived_mark_schemes_subject_updated_idx
  on public.derived_mark_schemes (subject_code, updated_at desc);

alter table public.derived_mark_schemes enable row level security;

-- Service-role only: no policies for anon/authenticated.
revoke all on table public.derived_mark_schemes from public;
grant all on table public.derived_mark_schemes to service_role;

comment on table public.derived_mark_schemes is
  'Cached derive-then-mark rubrics keyed by question fingerprint + total. Stabilises freeform remakes.';
