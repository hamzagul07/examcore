-- Phase 1 (Prompt C): extraction pipeline tables — does NOT touch mark_schemes.

-- ---------------------------------------------------------------------------
-- extracted_questions
-- ---------------------------------------------------------------------------
create table public.extracted_questions (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null,
  paper_number text not null,
  variant text not null,
  year int not null,
  session text not null,
  question_number text not null,
  question_path text not null,
  parent_question_id uuid references public.extracted_questions (id),
  question_text text not null,
  marks int,
  source_pdf_path text not null,
  source_page_numbers int[] not null,
  extraction_method text,
  extraction_confidence numeric,
  raw_extraction_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extracted_questions_identity_unique
    unique (subject_code, paper_number, variant, year, session, question_number)
);

create index extracted_questions_subject_paper_idx
  on public.extracted_questions (subject_code, paper_number);

create index extracted_questions_subject_year_session_idx
  on public.extracted_questions (subject_code, year, session);

create index extracted_questions_parent_idx
  on public.extracted_questions (parent_question_id);

comment on table public.extracted_questions is
  'Past-paper questions extracted from PDFs (Prompt C). Separate from mark_schemes.';

comment on column public.extracted_questions.extraction_method is
  'mathpix | gemini-vision | manual';

-- ---------------------------------------------------------------------------
-- extracted_mark_points
-- ---------------------------------------------------------------------------
create table public.extracted_mark_points (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.extracted_questions (id) on delete cascade,
  point_text text not null,
  marks_awarded numeric not null,
  point_order int not null,
  examiner_notes text,
  alternative_phrasings text[],
  source_pdf_path text not null,
  source_page_numbers int[] not null,
  created_at timestamptz not null default now()
);

create index extracted_mark_points_question_idx
  on public.extracted_mark_points (question_id);

-- ---------------------------------------------------------------------------
-- extracted_diagrams
-- ---------------------------------------------------------------------------
create table public.extracted_diagrams (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.extracted_questions (id) on delete cascade,
  image_storage_path text not null,
  image_public_url text not null,
  ai_description text,
  caption text,
  order_in_question int not null,
  bounding_box jsonb,
  created_at timestamptz not null default now()
);

create index extracted_diagrams_question_idx
  on public.extracted_diagrams (question_id);

-- ---------------------------------------------------------------------------
-- syllabus_objectives
-- ---------------------------------------------------------------------------
create table public.syllabus_objectives (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null,
  topic_code text not null,
  topic_title text not null,
  objective_number text not null,
  objective_text text not null,
  command_words text[],
  examined_in_papers text[],
  syllabus_year int not null,
  source_pdf_path text not null,
  created_at timestamptz not null default now(),
  constraint syllabus_objectives_identity_unique
    unique (subject_code, objective_number, syllabus_year)
);

create index syllabus_objectives_subject_topic_idx
  on public.syllabus_objectives (subject_code, topic_code);

-- ---------------------------------------------------------------------------
-- question_topic_tags
-- ---------------------------------------------------------------------------
create table public.question_topic_tags (
  question_id uuid not null references public.extracted_questions (id) on delete cascade,
  objective_id uuid not null references public.syllabus_objectives (id) on delete cascade,
  topic_code text not null,
  confidence numeric not null,
  tagged_by text not null,
  reviewed_by_human boolean not null default false,
  tagged_at timestamptz not null default now(),
  primary key (question_id, objective_id)
);

create index question_topic_tags_topic_code_idx
  on public.question_topic_tags (topic_code);

create index question_topic_tags_objective_idx
  on public.question_topic_tags (objective_id);

comment on column public.question_topic_tags.tagged_by is
  'e.g. gemini-2.0-flash | human | manual-review';

-- ---------------------------------------------------------------------------
-- extraction_jobs
-- ---------------------------------------------------------------------------
create table public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  source_pdf_path text not null unique,
  pdf_type text not null,
  status text not null,
  started_at timestamptz,
  completed_at timestamptz,
  pages_processed int not null default 0,
  questions_extracted int not null default 0,
  diagrams_extracted int not null default 0,
  cost_usd numeric not null default 0,
  error_message text,
  retry_count int not null default 0,
  created_at timestamptz not null default now(),
  constraint extraction_jobs_pdf_type_check
    check (pdf_type in ('question-paper', 'mark-scheme', 'syllabus')),
  constraint extraction_jobs_status_check
    check (status in ('pending', 'running', 'completed', 'failed'))
);

create index extraction_jobs_status_idx on public.extraction_jobs (status);
create index extraction_jobs_pdf_type_idx on public.extraction_jobs (pdf_type);

-- ---------------------------------------------------------------------------
-- RLS: service-role only (matches mark_schemes pattern)
-- ---------------------------------------------------------------------------
alter table public.extracted_questions enable row level security;
alter table public.extracted_mark_points enable row level security;
alter table public.extracted_diagrams enable row level security;
alter table public.syllabus_objectives enable row level security;
alter table public.question_topic_tags enable row level security;
alter table public.extraction_jobs enable row level security;

create policy extracted_questions_service_only on public.extracted_questions
  for all to authenticated, anon using (false) with check (false);

create policy extracted_mark_points_service_only on public.extracted_mark_points
  for all to authenticated, anon using (false) with check (false);

create policy extracted_diagrams_service_only on public.extracted_diagrams
  for all to authenticated, anon using (false) with check (false);

create policy syllabus_objectives_service_only on public.syllabus_objectives
  for all to authenticated, anon using (false) with check (false);

create policy question_topic_tags_service_only on public.question_topic_tags
  for all to authenticated, anon using (false) with check (false);

create policy extraction_jobs_service_only on public.extraction_jobs
  for all to authenticated, anon using (false) with check (false);
