-- What the second-opinion verify pass actually changes.
--
-- The verify result replaces the first marking pass unconditionally and in
-- either direction, and nothing recorded that the two had disagreed — only the
-- survivor was kept. So whether verification improves marks or degrades them
-- has never been answerable except by anecdote, and the anecdotes point both
-- ways: an essay moved 10 to 11 out of 12, a three-mark question moved 1 to 0.
--
-- Storing both makes the question a query instead of an argument. Read back by
-- `pnpm marking:health`, which reports how many marks moved, in which
-- direction, and the net.

alter table public.mark_runs
  add column if not exists first_pass_marks integer,
  add column if not exists final_marks integer;

comment on column public.mark_runs.first_pass_marks is
  'Marks awarded by the first marking pass, before the second-opinion verify ran. Null when verify did not run (MCQ, no breakdown).';

comment on column public.mark_runs.final_marks is
  'Marks after verify. Compared against first_pass_marks this says how often the verify pass moves a mark and in which direction — the verify result replaces the first pass unconditionally, so without this nothing records that they disagreed.';

create index if not exists mark_runs_verify_moved_idx
  on public.mark_runs (started_at desc)
  where first_pass_marks is not null and final_marks is distinct from first_pass_marks;
