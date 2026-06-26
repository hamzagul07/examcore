-- Free course lesson progress (replaces device-only localStorage for signed-in users).

create table if not exists public.course_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  last_lesson jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.course_progress is 'Per-user free course completion map + last visited lesson.';
comment on column public.course_progress.progress is 'Map: subjectCode → { lessonSlug: true }';
comment on column public.course_progress.last_lesson is '{ "code": "9702", "slug": "22-2-photoelectric-effect" }';

alter table public.course_progress enable row level security;

drop policy if exists course_progress_own on public.course_progress;
create policy course_progress_own
  on public.course_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists course_progress_updated_at_idx
  on public.course_progress (updated_at desc);
