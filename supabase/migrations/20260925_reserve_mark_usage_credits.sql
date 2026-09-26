-- Hold credits under the reservation lock, and reserve N marks at once.
--
-- APPLY THIS BEFORE THE APPLICATION DEPLOY. The new code prefers the 7-arg
-- signature below and falls back to the old 6-arg one when PostgREST cannot
-- find it, so either order works — but until this is applied credits are
-- still promised at the gate and spent at finalize (the race described next).
--
-- reserve_mark_usage counted the window and inserted the allowance row under a
-- per-user advisory lock, but credits lived outside it. The gate READ the
-- balance, promised "a credit will cover this", and consume_credit ran at
-- finalize — after the AI work — falling through to a plain usage row when the
-- balance had gone. Twenty parallel marks at cap with one credit all read "1",
-- all ran, and one of them paid. (Code review 2026-09-25, §2 marking core.)
--
-- Now, when the allowance is exhausted, the same transaction decrements
-- user_credits.balance and inserts the reserved rows with source = 'credits',
-- so the twenty-first request sees zero. release_mark_usage (new, below)
-- deletes a reservation's rows and refunds whatever it held — the failure
-- path in the route and the mark-run sweep both use it.
--
-- p_count lets a multi-question script reserve every question at the gate.
-- Extra questions used to be charged after the mark, with no cap check, so a
-- free user with one mark left could upload three questions and use three.
--
-- Every row of one reservation carries metadata.reservation_id — the first
-- row's id, which is also what the application stores as its handle (on
-- mark_runs.reservation_event_id) — so a whole reservation can be found,
-- linked to its attempt, or released from that one uuid.

-- The 6-arg signature must go: with both present PostgREST cannot pick a
-- candidate for a 6-name call ("could not choose the best candidate function").
DROP FUNCTION IF EXISTS public.reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer);

CREATE OR REPLACE FUNCTION public.reserve_mark_usage(
  p_user_id uuid,
  p_event_type text,
  p_source text,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_cap integer,
  p_count integer DEFAULT 1
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := greatest(coalesce(p_count, 1), 1);
  v_used integer;
  v_from_allowance integer;
  v_from_credits integer;
  v_balance integer;
  v_rid uuid := gen_random_uuid();
  v_i integer;
  v_meta jsonb;
BEGIN
  IF p_event_type NOT IN ('mark_single', 'mark_whole_paper') THEN
    RAISE EXCEPTION 'reserve_mark_usage: invalid event_type %', p_event_type;
  END IF;
  IF p_source NOT IN ('subscription', 'free_tier') THEN
    RAISE EXCEPTION 'reserve_mark_usage: invalid source %', p_source;
  END IF;

  -- Serialize concurrent reservations, releases, refunds and top-ups for this
  -- user. Transaction-scoped, so it is released automatically on COMMIT/ROLLBACK.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT count(*) INTO v_used
  FROM usage_events
  WHERE user_id = p_user_id
    AND source = p_source
    AND event_type IN ('mark_single', 'mark_whole_paper')
    AND created_at >= p_window_start
    AND (p_window_end IS NULL OR created_at < p_window_end);

  -- Whatever the window still holds comes from the allowance; the rest must
  -- come from credits. A cap of 0 (an inactive paid subscription) is the
  -- "credits only" case.
  v_from_allowance := least(v_count, greatest(coalesce(p_cap, 0) - v_used, 0));
  v_from_credits := v_count - v_from_allowance;

  SELECT balance INTO v_balance FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  v_balance := coalesce(v_balance, 0);

  IF v_from_credits > 0 THEN
    IF v_balance < v_from_credits THEN
      -- All or nothing: a three-question script against one remaining mark and
      -- no credits is refused, not partly charged. The caller answers 402.
      RETURN jsonb_build_object(
        'reserved', false,
        'used', v_used,
        'count', v_count,
        'via_credit', false,
        'credits_held', 0,
        'credit_balance', v_balance
      );
    END IF;
    UPDATE user_credits
       SET balance = balance - v_from_credits,
           total_used = total_used + v_from_credits,
           updated_at = now()
     WHERE user_id = p_user_id;
    v_balance := v_balance - v_from_credits;
  END IF;

  FOR v_i IN 1..v_count LOOP
    v_meta := jsonb_build_object(
      'recorded_at', now(),
      'reserved', true,
      'reservation_id', v_rid,
      'reservation_count', v_count
    );
    IF v_i > 1 THEN
      v_meta := v_meta || '{"extra_question": true}'::jsonb;
    END IF;
    INSERT INTO usage_events (id, user_id, event_type, attempt_id, credits_delta, source, metadata)
    VALUES (
      CASE WHEN v_i = 1 THEN v_rid ELSE gen_random_uuid() END,
      p_user_id,
      p_event_type,
      NULL,
      -1,
      CASE WHEN v_i <= v_from_allowance THEN p_source ELSE 'credits' END,
      v_meta
    );
  END LOOP;

  RETURN jsonb_build_object(
    'reserved', true,
    'used', v_used + v_from_allowance,
    'event_id', v_rid,
    'via_credit', v_from_credits > 0,
    'credits_held', v_from_credits,
    'count', v_count,
    'credit_balance', v_balance
  );
END;
$$;

COMMENT ON FUNCTION public.reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer, integer) IS
  'Atomic mark-quota gate. Reserves p_count marks from the window allowance, then from credits (decremented here, under the per-user lock). All-or-nothing. Rows share metadata.reservation_id = the returned event_id.';

-- Only the server (service role) may reserve usage; never callable by clients.
REVOKE ALL ON FUNCTION public.reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer, integer) FROM public;
REVOKE ALL ON FUNCTION public.reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_mark_usage(uuid, text, text, timestamptz, timestamptz, integer, integer) TO service_role;

-- ---------------------------------------------------------------------------
-- release_mark_usage: undo a reservation, refunding what it held.
--
-- DELETE … RETURNING is the idempotency: the second caller (a route's catch
-- and the sweep can both try) deletes nothing and refunds nothing. Only rows
-- still marked reserved and not yet linked to an attempt are touched, so a
-- finalized mark can never be released by a stale handle. Over-limit rows
-- written by the application in warn/off mode are reservations too.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.release_mark_usage(
  p_user_id uuid,
  p_event_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_released integer := 0;
  v_credits integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  WITH gone AS (
    DELETE FROM usage_events
    WHERE user_id = p_user_id
      AND event_type IN ('mark_single', 'mark_whole_paper')
      AND (id = p_event_id OR metadata->>'reservation_id' = p_event_id::text)
      AND (
        coalesce((metadata->>'reserved')::boolean, false)
        OR coalesce((metadata->>'over_limit')::boolean, false)
      )
      AND attempt_id IS NULL
    RETURNING source
  )
  SELECT count(*), count(*) FILTER (WHERE source = 'credits')
    INTO v_released, v_credits
  FROM gone;

  IF v_credits > 0 THEN
    UPDATE user_credits
       SET balance = balance + v_credits,
           total_used = greatest(total_used - v_credits, 0),
           updated_at = now()
     WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object('released', v_released, 'credits_refunded', v_credits);
END;
$$;

COMMENT ON FUNCTION public.release_mark_usage(uuid, uuid) IS
  'Delete a reservation''s unfinalized usage rows (by id or metadata.reservation_id) and refund the credits among them. Idempotent.';

REVOKE ALL ON FUNCTION public.release_mark_usage(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.release_mark_usage(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_mark_usage(uuid, uuid) TO service_role;

-- Release, finalize and the sweep look rows up by reservation id.
CREATE INDEX IF NOT EXISTS usage_events_reservation_idx
  ON public.usage_events ((metadata->>'reservation_id'))
  WHERE metadata ? 'reservation_id';
