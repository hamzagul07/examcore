-- Community Q&A: public threaded questions + answers per subject/topic/lesson.
-- Mirrors community_notes conventions (service-role writes after AI gate, public
-- reads published, denormalized counts + reputation via triggers). Reports reuse
-- the community_reports table (target_type 'question' | 'answer').

create table if not exists public.community_questions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete cascade not null,
  board text not null check (board in ('cambridge', 'ib')),
  subject_code text not null,
  topic_code text,
  lesson_slug text,
  title text not null,
  body_md text not null default '',
  status text not null default 'published'
    check (status in ('published', 'needs_edit', 'flagged', 'removed')),
  answer_count integer not null default 0,
  vote_count integer not null default 0,
  accepted_answer_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_community_questions_subject
  on public.community_questions (board, subject_code, topic_code, created_at desc)
  where status = 'published';

create table if not exists public.community_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.community_questions(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade not null,
  body_md text not null,
  status text not null default 'published'
    check (status in ('published', 'needs_edit', 'flagged', 'removed')),
  vote_count integer not null default 0,
  is_accepted boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists idx_community_answers_question
  on public.community_answers (question_id, vote_count desc);

create table if not exists public.community_question_votes (
  question_id uuid references public.community_questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (question_id, user_id)
);
create table if not exists public.community_answer_votes (
  answer_id uuid references public.community_answers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (answer_id, user_id)
);

-- answer_count on the question
create or replace function public.community_answer_count_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_questions set answer_count = answer_count + 1 where id = new.question_id;
  elsif tg_op = 'DELETE' then
    update public.community_questions set answer_count = greatest(0, answer_count - 1) where id = old.question_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_community_answer_count on public.community_answers;
create trigger trg_community_answer_count
  after insert or delete on public.community_answers
  for each row execute function public.community_answer_count_sync();

-- question votes
create or replace function public.community_question_vote_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_questions set vote_count = vote_count + 1 where id = new.question_id;
    update public.user_profiles set reputation = reputation + 1
      where id = (select author_id from public.community_questions where id = new.question_id);
  elsif tg_op = 'DELETE' then
    update public.community_questions set vote_count = greatest(0, vote_count - 1) where id = old.question_id;
    update public.user_profiles set reputation = greatest(0, reputation - 1)
      where id = (select author_id from public.community_questions where id = old.question_id);
  end if;
  return null;
end $$;
drop trigger if exists trg_community_question_vote on public.community_question_votes;
create trigger trg_community_question_vote
  after insert or delete on public.community_question_votes
  for each row execute function public.community_question_vote_sync();

-- answer votes (reputation weighted x2 for accepted answers handled in app)
create or replace function public.community_answer_vote_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_answers set vote_count = vote_count + 1 where id = new.answer_id;
    update public.user_profiles set reputation = reputation + 1
      where id = (select author_id from public.community_answers where id = new.answer_id);
  elsif tg_op = 'DELETE' then
    update public.community_answers set vote_count = greatest(0, vote_count - 1) where id = old.answer_id;
    update public.user_profiles set reputation = greatest(0, reputation - 1)
      where id = (select author_id from public.community_answers where id = old.answer_id);
  end if;
  return null;
end $$;
drop trigger if exists trg_community_answer_vote on public.community_answer_votes;
create trigger trg_community_answer_vote
  after insert or delete on public.community_answer_votes
  for each row execute function public.community_answer_vote_sync();

-- RLS
alter table public.community_questions enable row level security;
alter table public.community_answers enable row level security;
alter table public.community_question_votes enable row level security;
alter table public.community_answer_votes enable row level security;

drop policy if exists "read published or own questions" on public.community_questions;
create policy "read published or own questions" on public.community_questions
  for select using (status = 'published' or auth.uid() = author_id);
drop policy if exists "read published or own answers" on public.community_answers;
create policy "read published or own answers" on public.community_answers
  for select using (status = 'published' or auth.uid() = author_id);
drop policy if exists "manage own q votes" on public.community_question_votes;
create policy "manage own q votes" on public.community_question_votes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "manage own a votes" on public.community_answer_votes;
create policy "manage own a votes" on public.community_answer_votes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications (Phase 3 engagement loop)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  title text not null,
  href text,
  read boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user on public.notifications (user_id, read, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "update own notifications" on public.notifications;
create policy "update own notifications" on public.notifications
  for update using (auth.uid() = user_id);
