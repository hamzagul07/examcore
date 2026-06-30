-- Atomic mark-quota reservation to close a TOCTOU race in cap enforcement.
--
-- Background: lib/billing/enforcement.ts enforced the monthly mark cap by
-- COUNTING usage_events and, separately and later, INSERTING a new row. Those
-- two steps are not atomic, so concurrent marking requests could all read
-- `used < cap` before any of them recorded, then all proceed — exceeding the
-- cap (worst case: parallel whole-paper `init` calls).
--
-- This function does the check-and-insert in a single statement under a
-- per-user transaction-scoped advisory lock, so concurrent reservations for the
-- same user serialize and the count can never be raced. The application keeps
-- computing the cap/window/tier (those don't change mid-request) and passes them
-- in; only the count+insert needs to be atomic.
--
-- Returns: { reserved: bool, used: int, event_id?: uuid }
--   reserved=true  -> a usage_events row was inserted (event_id returned); the
--                     caller deletes it if the mark ultimately fails.
--   reserved=false -> user is at/over the cap; caller falls back to credits.

CREATE OR REPLACE FUNCTION reserve_mark_usage(
  p_user_id uuid,
  p_event_type text,
  p_source text,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_cap integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
  v_id uuid;
BEGIN
  -- Serialize concurrent reservations for this user. Transaction-scoped, so it
  -- is released automatically on COMMIT/ROLLBACK.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT count(*) INTO v_used
  FROM usage_events
  WHERE user_id = p_user_id
    AND source = p_source
    AND event_type IN ('mark_single', 'mark_whole_paper')
    AND created_at >= p_window_start
    AND (p_window_end IS NULL OR created_at < p_window_end);

  IF v_used >= p_cap THEN
    RETURN jsonb_build_object('reserved', false, 'used', v_used);
  END IF;

  INSERT INTO usage_events (user_id, event_type, attempt_id, credits_delta, source, metadata)
  VALUES (
    p_user_id,
    p_event_type,
    NULL,
    -1,
    p_source,
    jsonb_build_object('recorded_at', now(), 'reserved', true)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('reserved', true, 'used', v_used + 1, 'event_id', v_id);
END;
$$;

-- Only the server (service role) may reserve usage; never callable by clients.
REVOKE ALL ON FUNCTION reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer) FROM public;
GRANT EXECUTE ON FUNCTION reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer) TO service_role;
