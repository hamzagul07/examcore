-- IB assessment catalog — additive. Does NOT touch mark_schemes / attempts / billing.
-- Holds all components for every in-scope subject; marking-path wiring is sequenced separately.
-- Review target for IB_MARKING_BUILD_PLAN.md Part A (subject_group rename applied).
-- Apply manually (Supabase stays read-only from the agent side).

-- ---------------------------------------------------------------------------
-- ib_source_document — provenance / licensing anchor for every verbatim row
-- ---------------------------------------------------------------------------
create table public.ib_source_document (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  doc_type text not null,               -- subject_guide | markscheme | question_paper | assessment_instrument | ee_guide | tok_guide
  subject_code text,                    -- null for cross-subject (generic TOK/EE)
  cycle_version text not null,          -- e.g. '2021', '2025'
  first_assessment_year int,
  storage_path text,                    -- path to the licensed file
  notes text,
  supplied_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ib_subject — level-agnostic subject (level lives on ib_component)
-- ---------------------------------------------------------------------------
create table public.ib_subject (
  code text primary key,                -- 'ib-maths-aa', 'ib-biology', 'ib-tok', 'ib-extended-essay'
  name text not null,
  subject_group text not null,          -- 'Mathematics' | 'Sciences' | 'Individuals and Societies' | 'Core' | ...
  level_scope text not null,            -- 'HL_SL' | 'HL_only' | 'SL_only' | 'Core'
  guide_version text not null,          -- e.g. '2021'
  first_assessment_year int,
  source_document_id uuid references public.ib_source_document (id),
  created_at timestamptz not null default now(),
  constraint ib_subject_level_scope_chk
    check (level_scope in ('HL_SL','HL_only','SL_only','Core'))
);

-- ---------------------------------------------------------------------------
-- ib_component — the first-class per-component unit; carries assessment_model
-- ---------------------------------------------------------------------------
create table public.ib_component (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null references public.ib_subject (code) on delete cascade,
  component_key text not null,          -- paper_1 | paper_2 | paper_3 | ia | ee | tok_essay | tok_exhibition | io
  label text not null,                  -- student-facing, e.g. 'Paper 3 (HL)'
  level text not null,                  -- 'HL' | 'SL' | 'both'
  assessment_model text not null,       -- 'points' | 'criteria'
  response_format text,                 -- mcq | structured_points | markband | holistic (nullable / derived)
  max_marks int,
  source_document_id uuid references public.ib_source_document (id),
  created_at timestamptz not null default now(),
  constraint ib_component_model_chk
    check (assessment_model in ('points','criteria')),
  constraint ib_component_level_chk
    check (level in ('HL','SL','both')),
  constraint ib_component_identity_unique
    unique (subject_code, component_key, level)
);

create index ib_component_subject_level_idx
  on public.ib_component (subject_code, level);

-- ---------------------------------------------------------------------------
-- ib_criterion — criteria-model components only; verbatim name + optional guidance
-- ---------------------------------------------------------------------------
create table public.ib_criterion (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.ib_component (id) on delete cascade,
  letter text not null,                 -- 'A'..'E', 'LO1'..'LO7'
  name text not null,                   -- VERBATIM official criterion name
  max_marks int not null,
  ordinal int not null,
  guidance_notes text,                  -- VERBATIM official explanatory prose for the criterion (source of truth, cited)
  marking_guidance text,                -- OPTIONAL operational note; null by default (verbatim wins)
  source_document_id uuid references public.ib_source_document (id),
  source_pages int[],
  created_at timestamptz not null default now(),
  constraint ib_criterion_identity_unique unique (component_id, letter)
);

create index ib_criterion_component_idx on public.ib_criterion (component_id);

-- ---------------------------------------------------------------------------
-- ib_criterion_band — VERBATIM descriptor (authoritative) + optional marking_guidance
-- ---------------------------------------------------------------------------
create table public.ib_criterion_band (
  id uuid primary key default gen_random_uuid(),
  criterion_id uuid not null references public.ib_criterion (id) on delete cascade,
  marks_min int not null,
  marks_max int not null,
  descriptor text not null,             -- VERBATIM official band / achievement-level descriptor (student-facing, cited)
  marking_guidance text,                -- OPTIONAL operational rendering fed to the prompt; null by default
  source_document_id uuid references public.ib_source_document (id),
  source_pages int[],
  created_at timestamptz not null default now(),
  constraint ib_criterion_band_range_chk check (marks_min <= marks_max),
  constraint ib_criterion_band_identity_unique unique (criterion_id, marks_min, marks_max)
);

create index ib_criterion_band_criterion_idx on public.ib_criterion_band (criterion_id);

-- ---------------------------------------------------------------------------
-- ib_points_scheme — points-model components; verbatim structured scheme + optional guidance
-- ---------------------------------------------------------------------------
create table public.ib_points_scheme (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.ib_component (id) on delete cascade,
  paper_ref text,                       -- series/paper/question identifier, or null for generic conventions
  marks jsonb not null,                 -- VERBATIM structured mark points (mirrors existing point_based shape)
  accept_alternatives jsonb,            -- 'accept' equivalents / alternative valid forms
  ecf_rules jsonb,                      -- error-carried-forward linkage between parts
  marking_guidance jsonb,               -- OPTIONAL operational rendering; null by default
  source_document_id uuid references public.ib_source_document (id),
  source_pages int[],
  created_at timestamptz not null default now()
);

create index ib_points_scheme_component_idx on public.ib_points_scheme (component_id);

-- ---------------------------------------------------------------------------
-- Comments (semantics of the two-field text model)
-- ---------------------------------------------------------------------------
comment on table  public.ib_source_document is
  'Licensed IB documents supplied by the operator. Provenance anchor for every verbatim row.';
comment on column public.ib_criterion_band.descriptor is
  'VERBATIM official IBO band / achievement-level descriptor. Authoritative, student-facing, always cited. Source of truth.';
comment on column public.ib_criterion_band.marking_guidance is
  'OPTIONAL operational rendering assembled into the marking prompt. Null until authored. Verbatim descriptor always wins as source of truth.';
comment on column public.ib_criterion.guidance_notes is
  'VERBATIM official explanatory prose accompanying the criterion (e.g. Significant/Outstanding, Sophistication/Rigour). Authoritative, cited via source_document_id/source_pages. Drives marking accuracy.';
comment on column public.ib_criterion.marking_guidance is
  'OPTIONAL operational note for the marking prompt. Null by default; verbatim guidance_notes/descriptor win.';
comment on column public.ib_points_scheme.marking_guidance is
  'OPTIONAL operational rendering of the points scheme for the marking prompt. Null by default; verbatim marks jsonb is source of truth.';
comment on column public.ib_component.assessment_model is
  'points | criteria — the first-class routing axis. Confirmed against the official guide at ingestion; guide wins over phase-1 inference.';

-- ---------------------------------------------------------------------------
-- RLS: service-role only (licensed content). Client roles denied; service bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.ib_source_document enable row level security;
alter table public.ib_subject         enable row level security;
alter table public.ib_component        enable row level security;
alter table public.ib_criterion        enable row level security;
alter table public.ib_criterion_band   enable row level security;
alter table public.ib_points_scheme    enable row level security;

create policy ib_source_document_service_only on public.ib_source_document
  for all to authenticated, anon using (false) with check (false);
create policy ib_subject_service_only on public.ib_subject
  for all to authenticated, anon using (false) with check (false);
create policy ib_component_service_only on public.ib_component
  for all to authenticated, anon using (false) with check (false);
create policy ib_criterion_service_only on public.ib_criterion
  for all to authenticated, anon using (false) with check (false);
create policy ib_criterion_band_service_only on public.ib_criterion_band
  for all to authenticated, anon using (false) with check (false);
create policy ib_points_scheme_service_only on public.ib_points_scheme
  for all to authenticated, anon using (false) with check (false);
