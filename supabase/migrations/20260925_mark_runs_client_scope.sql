-- Scope the mark-run idempotency key to the caller.
--
-- uq_mark_runs_client_request_id (20260906) was GLOBAL: one partial unique
-- index over client_request_id alone, and the lookup in /api/mark/process was
-- not filtered by user either. So any caller who guessed — or replayed —
-- another user's key was told "duplicate" and handed that user's mark_run_id;
-- and a legitimate retry after the first run ended in error/abandoned hit
-- 23505 inside openMarkRun, which swallows it, so the retry ran with no
-- telemetry row at all. (Code review 2026-09-25, §1.8.)
--
-- The key is now unique per client_scope: the user id for a signed-in caller,
-- or 'ip:' + sha256(ip) for a guest — so a guest's retry from the same
-- network still dedupes, without storing the raw address on the run.
-- lib/rate-limit.ts (clientScopeKey) is the one place that builds it.
--
-- The route looks the row up by (client_scope, client_request_id), reuses a
-- row whose earlier run ended in error/abandoned, and only inserts when there
-- is none. The insert (openMarkRun) does not know the scope; the route writes
-- it straight after, and a 23505 on that write is the race the old index was
-- meant to catch — two uploads with one key inside the same second — which
-- the route reports as the duplicate it is.

ALTER TABLE public.mark_runs ADD COLUMN IF NOT EXISTS client_scope text;

COMMENT ON COLUMN public.mark_runs.client_scope IS
  'Who the client_request_id belongs to: the user id, or ip:<sha256 of the IP> for a guest. Idempotency keys are unique within a scope, not globally.';

-- Signed-in rows can be scoped retroactively; guest rows cannot (the IP was
-- never stored) and stay NULL, which the new index treats as distinct.
UPDATE public.mark_runs
   SET client_scope = user_id::text
 WHERE client_scope IS NULL
   AND client_request_id IS NOT NULL
   AND user_id IS NOT NULL;

DROP INDEX IF EXISTS public.uq_mark_runs_client_request_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mark_runs_client_scope_request_id
  ON public.mark_runs (client_scope, client_request_id)
  WHERE client_request_id IS NOT NULL;
