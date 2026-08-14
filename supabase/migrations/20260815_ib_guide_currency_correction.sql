-- Correct the guide end-dates set on 2026-08-13. Two were wrong in each
-- direction, and both errors came from the same mistake: I assumed the five
-- subjects under review shared one timetable, and never checked them apart.
--
-- Maths AA and AI are NOT ending. The IB's own curriculum-update pages put the
-- redeveloped courses at launch February 2027, first teaching August 2027, first
-- assessment May 2029 — so the 2021 guides run through the May 2028 session, two
-- years longer than recorded. Marked 2026, they would have been reported as
-- superseded to every student sitting them, and `pnpm ib:currency` would have
-- gone on demanding a replacement guide that does not exist yet and cannot for
-- another six months.
--
-- Psychology and Design technology ARE ending, and were recorded as null. Both
-- were first taught August 2025 and are first assessed May 2027, alongside the
-- three already listed — the IB publishes psychology-first-assessment-2027 and
-- design-technology-first-assessment-2027 guides. Null is the "nobody checked"
-- value, so these sat in the same bucket as genuinely-unknown subjects and no
-- report ever raised them.
--
-- The three correct rows (computer science, extended essay, visual arts) are
-- left alone: first teaching August 2025, first assessment May 2027, so May 2026
-- was indeed their last session.

-- Not ending in 2026 — two more sessions to run.
update public.ib_subject set last_assessment_year = 2028
where code in ('ib-maths-aa', 'ib-maths-ai');

-- Ending, and previously unrecorded.
update public.ib_subject set last_assessment_year = 2026
where code in ('ib-psychology', 'ib-design-technology');

-- Source documents inherit the same correction, so provenance shown to a student
-- does not contradict the subject it belongs to.
update public.ib_source_document d set last_assessment_year = s.last_assessment_year
from public.ib_subject s
where d.subject_code = s.code
  and s.code in ('ib-maths-aa', 'ib-maths-ai', 'ib-psychology', 'ib-design-technology')
  and d.last_assessment_year is distinct from s.last_assessment_year;
