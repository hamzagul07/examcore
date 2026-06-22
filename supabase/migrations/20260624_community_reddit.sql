-- Reddit-style community: unified posts, threaded comments, up/down voting, hot ranking.
-- Subjects act as subreddits; posts are discussions, questions, or resources (with attachments).

-- ─── Posts ──────────────────────────────────────────────────────────────────
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id) on delete cascade not null,
  board text not null check (board in ('cambridge', 'ib')),
  subject_code text not null,
  topic_code text,
  lesson_slug text,
  question_id uuid references public.extracted_questions(id) on delete set null,
  kind text not null default 'discussion' check (kind in ('discussion', 'question', 'resource')),
  flair text,
  title text not null,
  body_md text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  score integer not null default 0,
  comment_count integer not null default 0,
  hot_rank double precision not null default 0,
  status text not null default 'published'
    check (status in ('published', 'needs_edit', 'flagged', 'removed')),
  moderation_reason text,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body_md, '')), 'B')
  ) stored
);

create index if not exists idx_community_posts_subject
  on public.community_posts (board, subject_code, hot_rank desc) where status = 'published';
create index if not exists idx_community_posts_new
  on public.community_posts (created_at desc) where status = 'published';
create index if not exists idx_community_posts_top
  on public.community_posts (score desc) where status = 'published';
create index if not exists idx_community_posts_hot
  on public.community_posts (hot_rank desc) where status = 'published';
create index if not exists idx_community_posts_author
  on public.community_posts (author_id, created_at desc);
create index if not exists idx_community_posts_question
  on public.community_posts (question_id) where question_id is not null;
create index if not exists idx_community_posts_fts
  on public.community_posts using gin (search_vector) where status = 'published';

-- ─── Post votes ─────────────────────────────────────────────────────────────
create table if not exists public.community_post_votes (
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- ─── Comments (threaded) ────────────────────────────────────────────────────
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.community_posts(id) on delete cascade not null,
  parent_id uuid references public.community_comments(id) on delete cascade,
  author_id uuid references auth.users(id) on delete cascade not null,
  body_md text not null,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  score integer not null default 0,
  depth integer not null default 0,
  status text not null default 'published'
    check (status in ('published', 'flagged', 'removed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_community_comments_post
  on public.community_comments (post_id, created_at);
create index if not exists idx_community_comments_parent
  on public.community_comments (parent_id);
create index if not exists idx_community_comments_author
  on public.community_comments (author_id, created_at desc);

create table if not exists public.community_comment_votes (
  comment_id uuid references public.community_comments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz default now(),
  primary key (comment_id, user_id)
);

-- ─── Hot ranking (Reddit algorithm) ─────────────────────────────────────────
create or replace function public.community_hot(p_score int, p_created timestamptz)
returns double precision
language sql immutable as $$
  select round(
    cast(
      log(greatest(abs(p_score), 1)) * sign(greatest(p_score, -1))
      + (extract(epoch from p_created) - 1700000000) / 45000.0
    as numeric), 7
  )::double precision;
$$;

-- ─── Vote aggregation triggers ──────────────────────────────────────────────
create or replace function public.community_post_apply_votes()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_pid uuid;
  v_up int;
  v_down int;
  v_created timestamptz;
begin
  v_pid := coalesce(new.post_id, old.post_id);
  select count(*) filter (where value = 1), count(*) filter (where value = -1)
    into v_up, v_down from community_post_votes where post_id = v_pid;
  select created_at into v_created from community_posts where id = v_pid;
  update community_posts
    set upvotes = v_up, downvotes = v_down, score = v_up - v_down,
        hot_rank = community_hot(v_up - v_down, v_created)
    where id = v_pid;
  return null;
end $$;

drop trigger if exists trg_community_post_votes on public.community_post_votes;
create trigger trg_community_post_votes
  after insert or update or delete on public.community_post_votes
  for each row execute function public.community_post_apply_votes();

create or replace function public.community_comment_apply_votes()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cid uuid;
  v_up int;
  v_down int;
begin
  v_cid := coalesce(new.comment_id, old.comment_id);
  select count(*) filter (where value = 1), count(*) filter (where value = -1)
    into v_up, v_down from community_comment_votes where comment_id = v_cid;
  update community_comments
    set upvotes = v_up, downvotes = v_down, score = v_up - v_down
    where id = v_cid;
  return null;
end $$;

drop trigger if exists trg_community_comment_votes on public.community_comment_votes;
create trigger trg_community_comment_votes
  after insert or update or delete on public.community_comment_votes
  for each row execute function public.community_comment_apply_votes();

-- ─── Comment count trigger ──────────────────────────────────────────────────
create or replace function public.community_post_comment_count()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_pid uuid;
begin
  v_pid := coalesce(new.post_id, old.post_id);
  update community_posts
    set comment_count = (
      select count(*) from community_comments
      where post_id = v_pid and status = 'published'
    )
    where id = v_pid;
  return null;
end $$;

drop trigger if exists trg_community_comment_count on public.community_comments;
create trigger trg_community_comment_count
  after insert or update or delete on public.community_comments
  for each row execute function public.community_post_comment_count();

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.community_posts enable row level security;
alter table public.community_post_votes enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_comment_votes enable row level security;

drop policy if exists community_posts_read on public.community_posts;
create policy community_posts_read on public.community_posts
  for select using (status = 'published' or auth.uid() = author_id);

drop policy if exists community_comments_read on public.community_comments;
create policy community_comments_read on public.community_comments
  for select using (status = 'published' or auth.uid() = author_id);

drop policy if exists community_post_votes_own on public.community_post_votes;
create policy community_post_votes_own on public.community_post_votes
  for select using (auth.uid() = user_id);

drop policy if exists community_comment_votes_own on public.community_comment_votes;
create policy community_comment_votes_own on public.community_comment_votes
  for select using (auth.uid() = user_id);

-- ─── Storage bucket for attachments (private; served via signed URLs) ────────
insert into storage.buckets (id, name, public)
  values ('community-uploads', 'community-uploads', false)
  on conflict (id) do nothing;
