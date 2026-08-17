-- How often the stronger OCR read is needed, and how often it rescues the mark.
--
-- Answer OCR runs on Flash, which reads most handwriting fine and is what makes
-- marking affordable. When it cannot read a photo it does not error — it returns
-- confident nonsense, and everything downstream marks that. A real script came
-- back as "WPOT IRR WBET INBRR" and was scored 0/2 against it; Pro read the same
-- photo cleanly, showing a complete and correct derivation.
--
-- The escalation trigger was built from that one script, which cannot say whether
-- it fires too rarely or too often. These two columns make that a query:
--
--   tried but not kept   the photo is genuinely unreadable; the second call was
--                        spent for nothing and the trigger may be too loose
--   tried and kept       a mark that would have been wrong was rescued
--   never tried, yet the mark was bad — the trigger is too tight, which is what
--                        the first version of it was
--
-- Read back by `pnpm marking:health`.

alter table public.mark_runs
  add column if not exists ocr_escalations integer,
  add column if not exists ocr_escalations_kept integer;

comment on column public.mark_runs.ocr_escalations is
  'Transcriptions in this run that looked unread and were re-read on the stronger model. Null on runs that predate the counter.';

comment on column public.mark_runs.ocr_escalations_kept is
  'Of those, how many second reads were legible enough to use. tried-minus-kept is money spent on photos nobody could read.';

create index if not exists mark_runs_ocr_escalated_idx
  on public.mark_runs (started_at desc)
  where ocr_escalations > 0;
