-- Rollback for 20260606_extraction_pipeline.sql (Prompt C Phase 1)
-- Apply manually to verify rollback: run this file, then re-apply the up migration.

drop policy if exists extraction_jobs_service_only on public.extraction_jobs;
drop policy if exists question_topic_tags_service_only on public.question_topic_tags;
drop policy if exists syllabus_objectives_service_only on public.syllabus_objectives;
drop policy if exists extracted_diagrams_service_only on public.extracted_diagrams;
drop policy if exists extracted_mark_points_service_only on public.extracted_mark_points;
drop policy if exists extracted_questions_service_only on public.extracted_questions;

drop table if exists public.question_topic_tags;
drop table if exists public.extracted_mark_points;
drop table if exists public.extracted_diagrams;
drop table if exists public.extracted_questions;
drop table if exists public.syllabus_objectives;
drop table if exists public.extraction_jobs;
