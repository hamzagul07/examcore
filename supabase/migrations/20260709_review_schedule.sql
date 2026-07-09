-- Spaced-review schedule: per-user, per-topic state so weak topics resurface on
-- an expanding interval instead of every visit. Reconciled from marked attempts
-- server-side (lib/courses/review-queue.ts); service-role only (no client access).

create table if not exists public.review_schedule (
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_code text not null,
  topic_code text not null,
  interval_days integer not null default 1,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_code, topic_code)
);

create index if not exists idx_review_schedule_due
  on public.review_schedule (user_id, due_at);

-- RLS enabled, zero policies: only the service role (server) can read/write.
alter table public.review_schedule enable row level security;
