-- Paper 5 planning sections + MS section labels (Phase 10 / Fix 2).

alter table public.extracted_questions
  add column if not exists section_label text;

comment on column public.extracted_questions.section_label is
  'Paper 5 named section (e.g. Defining the problem) when sub-part uses planning headers instead of (a)(b).';

alter table public.extracted_mark_points
  add column if not exists section_label text;

comment on column public.extracted_mark_points.section_label is
  'Mark-scheme section label for Paper 5 headers like 1(Defining the problem).';
