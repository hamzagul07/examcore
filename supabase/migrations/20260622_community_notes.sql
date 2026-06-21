-- Community notes: student-contributed markdown notes per subject/topic/lesson.
--
-- Invariants:
--   * Writes flow through the API (service role) after a Gemini moderation gate.
--   * Public can READ only `published` notes (SEO); authors can read their own.
--   * Denormalized upvote_count/save_count + author reputation are kept in sync
--     by triggers on the vote/save tables (atomic, race-free).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.community_notes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete cascade not null,
  board text not null check (board in ('cambridge', 'ib')),
  subject_code text not null,
  topic_code text,
  lesson_slug text,
  title text not null,
  content_md text not null,
  image_paths text[] not null default '{}',
  status text not null default 'published'
    check (status in ('published', 'needs_edit', 'flagged', 'removed')),
  moderation_reason text,
  upvote_count integer not null default 0,
  save_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_community_notes_subject
  on public.community_notes (board, subject_code, topic_code, upvote_count desc)
  where status = 'published';
create index if not exists idx_community_notes_author
  on public.community_notes (author_id, created_at desc);

create table if not exists public.community_note_votes (
  note_id uuid references public.community_notes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (note_id, user_id)
);

create table if not exists public.community_note_saves (
  note_id uuid references public.community_notes(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (note_id, user_id)
);

-- Reports — shared with Q&A (Phase 3) via target_type.
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('note', 'question', 'answer')),
  target_id uuid not null,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz default now()
);
create index if not exists idx_community_reports_open
  on public.community_reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Denormalized counters + author reputation (triggers)
-- ---------------------------------------------------------------------------
create or replace function public.community_note_vote_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_notes set upvote_count = upvote_count + 1 where id = new.note_id;
    update public.user_profiles set reputation = reputation + 1
      where id = (select author_id from public.community_notes where id = new.note_id);
  elsif tg_op = 'DELETE' then
    update public.community_notes set upvote_count = greatest(0, upvote_count - 1) where id = old.note_id;
    update public.user_profiles set reputation = greatest(0, reputation - 1)
      where id = (select author_id from public.community_notes where id = old.note_id);
  end if;
  return null;
end $$;
drop trigger if exists trg_community_note_vote on public.community_note_votes;
create trigger trg_community_note_vote
  after insert or delete on public.community_note_votes
  for each row execute function public.community_note_vote_sync();

create or replace function public.community_note_save_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.community_notes set save_count = save_count + 1 where id = new.note_id;
  elsif tg_op = 'DELETE' then
    update public.community_notes set save_count = greatest(0, save_count - 1) where id = old.note_id;
  end if;
  return null;
end $$;
drop trigger if exists trg_community_note_save on public.community_note_saves;
create trigger trg_community_note_save
  after insert or delete on public.community_note_saves
  for each row execute function public.community_note_save_sync();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.community_notes enable row level security;
alter table public.community_note_votes enable row level security;
alter table public.community_note_saves enable row level security;
alter table public.community_reports enable row level security;

-- Public reads published notes; authors read their own (any status).
drop policy if exists "read published or own notes" on public.community_notes;
create policy "read published or own notes" on public.community_notes
  for select using (status = 'published' or auth.uid() = author_id);

-- Users see/manage their own votes + saves (writes also go via service role API).
drop policy if exists "manage own votes" on public.community_note_votes;
create policy "manage own votes" on public.community_note_votes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "manage own saves" on public.community_note_saves;
create policy "manage own saves" on public.community_note_saves
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reports: a user may file (insert) reports; only service role reads/moderates.
drop policy if exists "file own reports" on public.community_reports;
create policy "file own reports" on public.community_reports
  for insert with check (auth.uid() = reporter_id);
