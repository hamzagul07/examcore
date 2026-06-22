-- Exam Room rebuild: anchors, XP, subject reputation, atomic accept, search, extended moderation.

-- Anchor doubts & cheat sheets to a specific past-paper question.
alter table public.community_questions
  add column if not exists question_id uuid references public.extracted_questions(id) on delete set null;
alter table public.community_notes
  add column if not exists question_id uuid references public.extracted_questions(id) on delete set null;

create index if not exists idx_community_questions_question
  on public.community_questions (question_id) where question_id is not null and status = 'published';
create index if not exists idx_community_notes_question
  on public.community_notes (question_id) where question_id is not null and status = 'published';

-- moderation_reason on questions (parity with notes)
alter table public.community_questions
  add column if not exists moderation_reason text;

-- XP events (learning + community actions)
create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  kind text not null,
  subject_code text,
  points integer not null default 0,
  ref_id uuid,
  created_at timestamptz default now()
);
create index if not exists idx_xp_events_user on public.xp_events (user_id, created_at desc);
create index if not exists idx_xp_events_subject on public.xp_events (subject_code, created_at desc)
  where subject_code is not null;

alter table public.xp_events enable row level security;
create policy xp_events_select_own on public.xp_events for select using (auth.uid() = user_id);

-- Per-subject reputation aggregate
create table if not exists public.community_subject_reputation (
  user_id uuid references auth.users(id) on delete cascade not null,
  subject_code text not null,
  reputation integer not null default 0,
  primary key (user_id, subject_code)
);
create index if not exists idx_community_subject_rep_subject
  on public.community_subject_reputation (subject_code, reputation desc);

alter table public.community_subject_reputation enable row level security;
create policy community_subject_rep_select on public.community_subject_reputation for select using (true);

-- Bump subject reputation (called from application layer on vote/accept events)
create or replace function public.bump_subject_reputation(p_user_id uuid, p_subject_code text, p_delta int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null or p_subject_code is null or p_delta = 0 then return; end if;
  insert into community_subject_reputation (user_id, subject_code, reputation)
    values (p_user_id, p_subject_code, greatest(0, p_delta))
  on conflict (user_id, subject_code) do update
    set reputation = greatest(0, community_subject_reputation.reputation + p_delta);
end $$;

-- Atomic accept answer
create or replace function public.community_accept_answer(
  p_question_id uuid,
  p_answer_id uuid,
  p_user_id uuid
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_author uuid;
begin
  select author_id into v_author from community_questions where id = p_question_id;
  if v_author is null or v_author <> p_user_id then
    return false;
  end if;
  update community_answers set is_accepted = false where question_id = p_question_id;
  update community_answers set is_accepted = true
    where id = p_answer_id and question_id = p_question_id;
  update community_questions set accepted_answer_id = p_answer_id where id = p_question_id;
  return true;
end $$;

-- Full-text search helpers
alter table public.community_questions
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body_md, '')), 'B')
  ) stored;
alter table public.community_notes
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content_md, '')), 'B')
  ) stored;

create index if not exists idx_community_questions_fts
  on public.community_questions using gin (search_vector)
  where status = 'published';
create index if not exists idx_community_notes_fts
  on public.community_notes using gin (search_vector)
  where status = 'published';

-- Auto-flag questions and answers at report threshold (notes already handled in API)
create or replace function public.community_auto_flag_target(
  p_target_type text,
  p_target_id uuid,
  p_threshold int default 2
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  select count(*) into v_count from community_reports
    where target_type = p_target_type and target_id = p_target_id and status = 'open';
  if v_count < p_threshold then return; end if;

  if p_target_type = 'note' then
    update community_notes set status = 'flagged' where id = p_target_id and status = 'published';
  elsif p_target_type = 'question' then
    update community_questions set status = 'flagged' where id = p_target_id and status = 'published';
  elsif p_target_type = 'answer' then
    update community_answers set status = 'flagged' where id = p_target_id and status = 'published';
  end if;
end $$;
