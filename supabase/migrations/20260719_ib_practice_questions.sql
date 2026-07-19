-- IB practice-question cache.
--
-- IB has no stored past-paper questions (mark_schemes is 100% Cambridge), so the
-- "drill your weakest topic" loop generates an exam-style question per IB topic
-- with an LLM. Generation is expensive and should be stable across drills, so we
-- cache one question per (subject_code, topic_code) here. The app degrades
-- gracefully if this table is absent (it just regenerates each time), so applying
-- this migration only turns caching ON — it is not required for correctness.

create table if not exists public.ib_practice_questions (
  id uuid primary key default gen_random_uuid(),
  subject_code text not null,
  topic_code text not null,
  component text,
  question_text text not null,
  total_marks int,
  created_at timestamptz not null default now()
);

-- One cached question per topic — the app upserts on this key.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ib_practice_questions_subject_topic_key'
  ) then
    alter table public.ib_practice_questions
      add constraint ib_practice_questions_subject_topic_key
      unique (subject_code, topic_code);
  end if;
end $$;

-- Server-only: read/written exclusively via the service-role client. RLS on with
-- no policies locks out anon/authenticated direct access (service role bypasses).
alter table public.ib_practice_questions enable row level security;
