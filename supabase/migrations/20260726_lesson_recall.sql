-- Spaced recall for lessons a student has actively worked, not just read.
--
-- buildReviewQueue() is built entirely from `attempts` and returns [] when a
-- student has none. Since only a minority of users ever mark anything, the whole
-- spaced-review system is invisible to most of them — they read lessons, learn
-- nothing is tracked, and never come back.
--
-- Completing a lesson's quick check is the strongest non-marking signal we have
-- that real work happened: the student produced answers rather than reading
-- them. This table records that so those lessons can resurface for recall.
--
-- Scheduling is kept HERE rather than in `review_schedule` on purpose. That
-- table is keyed (user_id, subject_code, topic_code) and driven by mastery from
-- marked attempts; folding a second, differently-paced signal into the same row
-- would have the two sources overwrite each other's intervals.

create table if not exists public.lesson_recall (
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_code text not null,
  lesson_slug text not null,
  -- Syllabus topic for this lesson, so the queue can suppress a recall item
  -- once the student has actually been marked on the same topic.
  topic_code text not null,
  answered_count integer not null default 0,
  total_count integer not null default 0,
  -- Expanding interval, in days, since the last time they worked this lesson.
  interval_days integer not null default 3,
  due_at timestamptz not null default (now() + interval '3 days'),
  last_worked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_code, lesson_slug)
);

create index if not exists lesson_recall_due_idx
  on public.lesson_recall (user_id, due_at);

-- RLS enabled with zero policies: server-only, matching review_schedule.
alter table public.lesson_recall enable row level security;

-- Belt and braces on top of the empty policy set. RLS constrains rows, not
-- columns, and TRUNCATE is not constrained by RLS at all — a read-only role
-- must not be able to wipe a student's recall history.
revoke select, insert, update, delete, truncate on public.lesson_recall
  from anon, authenticated;

comment on table public.lesson_recall is
  'Lessons whose quick check a student completed. Feeds buildReviewQueue for students with no marked attempts. SERVER-ONLY — see /api/courses/recall.';
