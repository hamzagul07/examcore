-- When each IB guide stops being assessed.
--
-- The catalogue recorded `first_assessment_year` and nothing else, so a guide
-- that had been withdrawn looked identical to a current one. That is not a
-- theoretical gap: a Theatre 2017 rubric was ingested and marked students live
-- against a guide last assessed in 2023, whose tasks carry four criteria where
-- the current course has three, and whose internal assessment no longer exists.
-- Nothing in the system could have noticed.
--
-- A guide's own cover states when it started, never when it stopped. Only the
-- publication record says that, so it has to be recorded here deliberately.

alter table public.ib_subject
  add column if not exists last_assessment_year integer;

comment on column public.ib_subject.last_assessment_year is
  'Final exam session this guide is assessed in. Null means no published end date — current as far as we know. A year in the past means the catalogued rubric is withdrawn and marking must say so.';

alter table public.ib_source_document
  add column if not exists last_assessment_year integer;

comment on column public.ib_source_document.last_assessment_year is
  'Final exam session this document governs, so provenance survives even after the subject row moves on to a newer guide.';

-- Researched 2026-08-13 against IB curriculum-update publications. Each of
-- these was last assessed in the May 2026 session, which has passed: students
-- studying now sit the replacement, first assessed 2027.
update public.ib_subject set last_assessment_year = 2026
where code in (
  'ib-maths-aa',
  'ib-maths-ai',
  'ib-computer-science',
  'ib-extended-essay',
  'ib-visual-arts'
);

-- Everything else is left null rather than guessed. An unknown end date and a
-- confirmed-current guide must not be written the same way round: null here
-- means "no published end date found", not "verified current forever".
