-- Phase 1 pipeline optimizations: diagram description backlog + job metadata

alter table public.extracted_diagrams
  add column if not exists description_status text not null default 'pending';

alter table public.extracted_diagrams
  add constraint extracted_diagrams_description_status_check
  check (description_status in ('pending', 'complete', 'skipped'));

alter table public.extraction_jobs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public)
values ('extracted-diagrams', 'extracted-diagrams', true)
on conflict (id) do update set public = excluded.public;
