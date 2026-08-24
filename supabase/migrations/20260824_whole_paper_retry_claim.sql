-- Make the whole-paper retry cap actually bind.
--
-- APPLY THIS BEFORE THE APPLICATION DEPLOY.
-- It only adds a defaulted column and a function, which the currently deployed
-- code ignores. The new code calls claim_whole_paper_retry(), so deploying first
-- would make every retry 500 until this exists.
--
-- The bug: app/api/mark/whole-paper/retry/route.ts read retry_count out of the
-- ai_marking JSONB, performed the full derive → mark → verify, and wrote
-- count + 1 afterwards. Twenty concurrent retries all read the same value, all
-- did the billable work, and last-write-wins left the counter at one. The cap
-- (MAX_RETRIES_PER_ATTEMPT = 15) never bound, and the endpoint's own comment
-- says it exists so retries "can't be scripted into free unlimited marking".
--
-- Retries deliberately do NOT consume a quota slot — the paper already spent one
-- at run time, and a question that failed to mark is not the student's fault.
-- The count IS the only thing standing between that decision and unbounded
-- Gemini spend, so it has to be incremented atomically, before the AI call.
--
-- PostgREST cannot express `SET x = x + 1`, so this is an RPC rather than a
-- conditional update from the route. Same shape as reserve_mark_usage.
--
-- The counter moves out of JSONB into a real column because a read-modify-write
-- on a JSON field cannot be made atomic from the client at all. The route still
-- mirrors the value into ai_marking.retry_count so existing readers and the UI
-- keep working; the column is what the limit is enforced against.
alter table public.attempts
  add column if not exists whole_paper_retry_count integer not null default 0;

-- Existing papers carry their count inside ai_marking. Without this backfill an
-- attempt that had already used 15 retries would silently get 15 more.
update public.attempts
   set whole_paper_retry_count = coalesce((ai_marking->>'retry_count')::int, 0)
 where whole_paper_retry_count = 0
   and ai_marking ? 'retry_count'
   and coalesce((ai_marking->>'retry_count')::int, 0) > 0;

/**
 * Claim one retry slot. Returns the new count, or NULL when the attempt is at
 * or over the cap — the caller must treat NULL as "refuse and do no AI work".
 *
 * The UPDATE ... WHERE ... RETURNING is a single statement, so Postgres
 * serialises concurrent callers on the row: exactly one crosses the boundary at
 * the cap and the rest get no row back.
 */
create or replace function public.claim_whole_paper_retry(
  p_attempt_id uuid,
  p_max integer
)
returns integer
language sql
security definer
set search_path = public
as $$
  update public.attempts
     set whole_paper_retry_count = whole_paper_retry_count + 1
   where id = p_attempt_id
     and whole_paper_retry_count < p_max
  returning whole_paper_retry_count;
$$;

-- Service role only: the marking routes call this, never a browser. Matches the
-- lockdown applied to the other billing-adjacent RPCs.
revoke execute on function public.claim_whole_paper_retry(uuid, integer) from anon, authenticated;

comment on column public.attempts.whole_paper_retry_count is
  'Whole-paper re-marks used. Enforced via claim_whole_paper_retry(); ai_marking.retry_count mirrors it for display only.';
