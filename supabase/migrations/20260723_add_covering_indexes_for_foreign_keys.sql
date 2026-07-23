-- Performance: covering indexes for foreign keys that had none.
--
-- The performance advisor flagged 18 FKs without a covering index. Without one,
-- a query joining/filtering on the FK column, and every DELETE of the parent
-- row (which scans the child table to enforce the constraint), does a full scan.
-- Several are on hot paths: community_answers.author_id (public profile pages),
-- the *_votes.user_id columns ("has this user voted?" lookups), and
-- attempts.mark_scheme_id joins. All additive and idempotent.
create index if not exists ix_attempts_mark_scheme_id_fkey on public.attempts (mark_scheme_id);
create index if not exists ix_community_answer_votes_user_id_fkey on public.community_answer_votes (user_id);
create index if not exists ix_community_answers_author_id_fkey on public.community_answers (author_id);
create index if not exists ix_community_comment_votes_user_id_fkey on public.community_comment_votes (user_id);
create index if not exists ix_community_note_saves_user_id_fkey on public.community_note_saves (user_id);
create index if not exists ix_community_note_votes_user_id_fkey on public.community_note_votes (user_id);
create index if not exists ix_community_post_votes_user_id_fkey on public.community_post_votes (user_id);
create index if not exists ix_community_question_votes_user_id_fkey on public.community_question_votes (user_id);
create index if not exists ix_community_reports_reporter_id_fkey on public.community_reports (reporter_id);
create index if not exists ix_contact_messages_user_id_fkey on public.contact_messages (user_id);
create index if not exists ix_ib_component_source_document_id_fkey on public.ib_component (source_document_id);
create index if not exists ix_ib_criterion_band_source_document_id_fkey on public.ib_criterion_band (source_document_id);
create index if not exists ix_ib_criterion_source_document_id_fkey on public.ib_criterion (source_document_id);
create index if not exists ix_ib_points_scheme_source_document_id_fkey on public.ib_points_scheme (source_document_id);
create index if not exists ix_ib_subject_source_document_id_fkey on public.ib_subject (source_document_id);
create index if not exists ix_intervention_tests_classroom_id_fkey on public.intervention_tests (classroom_id);
create index if not exists ix_intervention_tests_teacher_id_fkey on public.intervention_tests (teacher_id);
create index if not exists ix_mark_feedback_user_id_fkey on public.mark_feedback (user_id);
