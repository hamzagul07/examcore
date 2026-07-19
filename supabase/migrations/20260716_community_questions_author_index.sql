-- Index community_questions by author for profile pages.
--
-- listQuestions({ authorId }) (lib/community/qa.ts) powers the public user
-- profile page (app/(marketing)/u/[username]/page.tsx), filtering
-- `status = 'published' AND author_id = ? ORDER BY created_at DESC`. The
-- existing indexes cover (board, subject_code, topic_code) and FTS, but not
-- author lookups, so this query does a full scan of published questions.
-- Partial index mirrors the shape of idx_community_questions_subject.

create index if not exists idx_community_questions_author
  on public.community_questions (author_id, created_at desc)
  where status = 'published';
