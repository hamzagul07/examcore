-- Two more kinds of post, for the two things students already do in the
-- community but had no shape for.
--
-- 'paper'  — discussion of a specific paper right after sitting it. Currently
--            filed as generic discussion, which buries it exactly when it is
--            the most active thing in the room.
-- 'win'    — a result or a milestone worth sharing.
--
-- Deliberately NOT adding a study-partner kind here. It would invite students,
-- many of them minors, to post contact details publicly. The app already has
-- 1:1 messaging, so the safe shape is "find a partner, then DM" — that needs a
-- moderation design, not an enum value.

alter table public.community_posts
  drop constraint if exists community_posts_kind_check;

alter table public.community_posts
  add constraint community_posts_kind_check
  check (kind in ('discussion', 'question', 'resource', 'paper', 'win'));
