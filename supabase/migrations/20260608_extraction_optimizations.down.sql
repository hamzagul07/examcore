alter table public.extraction_jobs drop column if exists metadata;

alter table public.extracted_diagrams
  drop constraint if exists extracted_diagrams_description_status_check;

alter table public.extracted_diagrams drop column if exists description_status;
