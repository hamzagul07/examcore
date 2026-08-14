-- Three more end-dates, found by researching the "no published end date" list
-- one subject at a time. Two of them are already withdrawn — not expiring, gone
-- — which no report has been saying because null and "checked, still current"
-- were indistinguishable until the dates below existed.
--
-- Philosophy: the 2016 guide's final examinations were November 2024. The
-- replacement was published February 2023 for first assessment 2025 and adds a
-- seventh theme (social philosophy) around the mandatory core theme "Being
-- human". Our catalogue holds the 2016 guide, so philosophy has been marked
-- against a withdrawn rubric for twenty-one months.
--
-- Language A: language and literature: the 2021 guide's last session was
-- November 2025. Updated guides were first taught September 2024 for first
-- assessment May 2026, which has already passed. This one is worse than stale.
-- The update moved marks between criteria: criterion A drops from 10 to 5, and
-- criterion B stays at 10 but splits into B1 and B2 of 5 each. Our Paper 2 is
-- stored as A10 B10 C5 D5 = 30; under the live guide it is A5 B10 C5 D5 = 25. A
-- wrong denominator is not a cosmetic staleness — it is a wrong percentage on
-- every Language A Paper 2 we mark.
--
-- The new criterion marks are deliberately NOT written here. They come from a
-- secondary source, and criteria are verbatim licensed content; a rubric that is
-- wrong in a new way is not an improvement on one that is wrong in an old way.
-- Dating the guide is what makes the gap visible and is all the evidence
-- supports.
--
-- Language B: not withdrawn. The redeveloped course is first taught August 2027
-- and first assessed May 2029, so the 2020 guide runs through May 2028. Recorded
-- to stop it looking unchecked.

update public.ib_subject set last_assessment_year = 2024 where code = 'ib-philosophy';
update public.ib_subject set last_assessment_year = 2025 where code = 'ib-lang-a-langlit';
update public.ib_subject set last_assessment_year = 2028 where code = 'ib-language-b';

update public.ib_source_document d set last_assessment_year = s.last_assessment_year
from public.ib_subject s
where d.subject_code = s.code
  and s.code in ('ib-philosophy', 'ib-lang-a-langlit', 'ib-language-b')
  and d.last_assessment_year is distinct from s.last_assessment_year;
