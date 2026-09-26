-- Let the sweep give back the marks that killed functions were holding.
--
-- A mark reservation (usage_events row, credits held) is settled by the route:
-- finalize on success, release on failure. A function killed mid-run reaches
-- neither, and nothing else knew the reservation existed: mark_runs recorded
-- that the run died, but not what it was holding. The sweep flipped the row to
-- 'abandoned' and the student permanently lost one mark this period — or one
-- credit — for a mark they never received. (Code review 2026-09-25, §2.)
--
-- The route now writes the reservation handle onto the run as soon as both
-- exist, and the sweep releases it (release_mark_usage) for every run it
-- abandons. `reservation_released_at` is the receipt: a sweep that dies between
-- abandoning a run and releasing its reservation leaves the run visible to the
-- next sweep, and a released run is never released twice — the RPC is
-- idempotent regardless, this just stops the re-try from being a habit.

alter table public.mark_runs
  add column if not exists reservation_event_id uuid,
  add column if not exists reservation_released_at timestamptz;

comment on column public.mark_runs.reservation_event_id is
  'usage_events reservation handle (first row id; other rows carry it as metadata.reservation_id). Null for guests and for runs that never reserved. Released by the sweep when the run is abandoned.';
comment on column public.mark_runs.reservation_released_at is
  'When the sweep released reservation_event_id for an abandoned run. Null until then; a run that finalized or released itself is never stamped.';

-- The sweep's retry query: abandoned runs still holding a reservation.
create index if not exists mark_runs_unreleased_reservation_idx
  on public.mark_runs (started_at)
  where status = 'abandoned'
    and reservation_event_id is not null
    and reservation_released_at is null;
