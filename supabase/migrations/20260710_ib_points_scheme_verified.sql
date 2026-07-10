-- Human-QA gate for IB official points schemes.
--
-- Only VERIFIED schemes are ever used to mark a student (see
-- resolveComponentForMarking) — an inaccurate ingested scheme marks worse than
-- the derive-then-mark fallback. New ingested rows default to false and must be
-- spot-checked before being flipped to true. The resolver filters on `verified`
-- defensively, so shipping the code before this migration is safe (schemes are
-- simply unused until it runs).
--
-- Additive + tiny table → safe to apply anytime.
alter table public.ib_points_scheme
  add column if not exists verified boolean not null default false;

-- The one hand-seeded sample (Maths AA SL P1 Q1) was authored by hand → trusted.
update public.ib_points_scheme set verified = true where verified = false;
