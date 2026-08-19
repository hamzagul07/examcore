-- Make the Polar webhook inbox survive a killed function.
--
-- APPLY THIS BEFORE THE APPLICATION DEPLOY.
-- It only adds a nullable-defaulted column, which the currently deployed code
-- ignores, so applying it early is safe. The new code reads `claimed_at`, so
-- deploying first would make every webhook 500 until the column exists.
--
-- The bug: app/api/billing/polar-webhook/route.ts claims an event id with a
-- primary-key insert BEFORE running the side effect, and deletes the claim if
-- the handler throws. That is correct for exceptions and wrong for termination.
-- Vercel killing the invocation between the claim and the grant leaves the row
-- present and the customer ungranted; Polar retries, hits the PK conflict, and
-- the retry is discarded as a duplicate. A paying customer permanently receives
-- nothing, and nothing in the system records that it happened.
--
-- `processed_at` already existed but defaulted to now() at INSERT time, so it
-- recorded when the event was claimed, not when it finished — it could not tell
-- the two states apart. It now means completion and nothing else: the route
-- inserts it as NULL and stamps it after the handler returns.
--
-- `claimed_at` is what makes a stale claim recoverable. A row with a null
-- `processed_at` and a `claimed_at` older than the lease window belonged to an
-- invocation that died, and may be taken over. Inside the window it belongs to a
-- request that is probably still running, and the retry is told to come back.
alter table public.polar_webhook_events
  add column if not exists claimed_at timestamptz not null default now();

-- Existing rows all pre-date this change and were only ever written on the
-- completion path of the old code, so they are genuinely processed. Without this
-- they would have processed_at set (from the old default) and be treated as
-- complete anyway — the backfill is here to make that explicit rather than
-- incidental.
update public.polar_webhook_events
   set processed_at = coalesce(processed_at, claimed_at)
 where processed_at is null;

-- Sweeping for stuck claims is a scan over an unindexed predicate otherwise.
create index if not exists polar_webhook_events_unprocessed_idx
  on public.polar_webhook_events (claimed_at)
  where processed_at is null;

comment on column public.polar_webhook_events.processed_at is
  'Set only after the side effect completed. NULL means claimed but unfinished — a retry may take the row over once claimed_at is outside the lease window.';
comment on column public.polar_webhook_events.claimed_at is
  'When this delivery was claimed. With processed_at NULL, distinguishes a request still running from an invocation that was killed mid-handler.';
