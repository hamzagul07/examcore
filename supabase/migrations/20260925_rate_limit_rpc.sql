-- Atomic per-IP daily rate limiting.
--
-- Every guest cap in lib/rate-limit.ts was check-then-increment: read the
-- counter, compare, do the work, then upsert count + 1. Nothing about that is
-- atomic, and for the guest mark it was worse than non-atomic — the increment
-- ran only AFTER the pipeline finished, minutes later. N parallel guest
-- requests from one IP all read `mark_count = 0`, all passed the `>= 1`
-- check, and each one ran derive + mark + verify on Gemini Pro. The "1 guest
-- mark a day" cap bounded nothing. (Code review 2026-09-25, §1.7.)
--
-- bump_rate_limit is the whole fix: one statement that inserts the day's row
-- or increments the counter, but only while the counter is under the limit,
-- and reports whether it did. Two racing callers cannot both be told "yes"
-- for the last slot, because the UPDATE's WHERE is evaluated under the row
-- lock the ON CONFLICT path takes. Callers consume at request start, before
-- any model call, and refund_rate_limit gives the slot back when the run fails
-- so a Gemini outage does not also eat the guest's one mark.
--
-- The counter name is interpolated into SQL, so it is validated against a
-- fixed allowlist first (%I quoting alone would still let a caller bump any
-- column on the table).
--
-- Service-role only, like every other RPC the routes call with the admin
-- client: an anon caller must not be able to spend — or refund — anyone's
-- slots.

-- The table predates the migrations directory. Re-declare it idempotently so
-- a preview database built by replay has the same shape production does.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  date date NOT NULL,
  mark_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS mark_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS omni_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS contact_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS signup_count integer NOT NULL DEFAULT 0;
-- New buckets. teach-back and explain were guarded only by an in-process Map
-- that is per-lambda and empty on every cold start; site-search and
-- question-detail had no cap at all.
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS teachback_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS explain_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS search_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS question_detail_count integer NOT NULL DEFAULT 0;

-- ON CONFLICT (ip, date) needs a unique index on exactly those columns. The
-- application's upserts have relied on one for months, so production has it
-- under some name; only create ours when nothing equivalent exists, so replay
-- does not stack a second index on the same key.
DO $$
DECLARE
  v_has_unique boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c ON c.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'rate_limits'
      AND i.indisunique
      AND i.indnkeyatts = 2
      AND (
        SELECT array_agg(a.attname::text ORDER BY k.ord)
        FROM unnest(i.indkey::int2[]) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
      ) = ARRAY['ip', 'date']
  ) INTO v_has_unique;

  IF NOT v_has_unique THEN
    CREATE UNIQUE INDEX rate_limits_ip_date_key ON public.rate_limits (ip, date);
  END IF;
END $$;

-- Service-role only. Re-asserted here because the table may have just been
-- created by the block above on a fresh database.
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rate_limits_service_only ON public.rate_limits;
CREATE POLICY rate_limits_service_only
  ON public.rate_limits
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.rate_limits IS
  'Per-key daily counters for guest and abuse caps. ip holds a client IP, or user:<id> for a signed-in cap. Only bump_rate_limit / refund_rate_limit write it.';

CREATE OR REPLACE FUNCTION public.bump_rate_limit(
  p_ip text,
  p_date date,
  p_counter text,
  p_limit integer
) RETURNS TABLE (allowed boolean, count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Allowlist BEFORE the format(): %I stops injection but not "bump a column
  -- this caller was never meant to touch".
  IF p_counter IS NULL OR p_counter NOT IN (
    'mark_count', 'omni_count', 'contact_count', 'signup_count',
    'teachback_count', 'explain_count', 'search_count', 'question_detail_count'
  ) THEN
    RAISE EXCEPTION 'bump_rate_limit: unknown counter %', p_counter;
  END IF;
  IF p_ip IS NULL OR length(p_ip) = 0 OR length(p_ip) > 128 THEN
    RAISE EXCEPTION 'bump_rate_limit: invalid key';
  END IF;
  IF p_date IS NULL THEN
    RAISE EXCEPTION 'bump_rate_limit: date is required';
  END IF;

  -- A cap of zero (or less) admits nobody; do not create a row for it.
  IF coalesce(p_limit, 0) <= 0 THEN
    EXECUTE format('SELECT %I FROM public.rate_limits WHERE ip = $1 AND date = $2', p_counter)
      INTO v_count USING p_ip, p_date;
    RETURN QUERY SELECT false, coalesce(v_count, 0);
    RETURN;
  END IF;

  -- Insert the day's row at 1, or increment — but only while under the limit.
  -- When the WHERE fails nothing is updated and RETURNING yields no row, so
  -- v_count stays NULL: that is the "denied" signal.
  EXECUTE format(
    'INSERT INTO public.rate_limits (ip, date, %1$I) VALUES ($1, $2, 1)
     ON CONFLICT (ip, date) DO UPDATE
       SET %1$I = public.rate_limits.%1$I + 1
       WHERE public.rate_limits.%1$I < $3
     RETURNING %1$I',
    p_counter
  ) INTO v_count USING p_ip, p_date, p_limit;

  IF v_count IS NULL THEN
    EXECUTE format('SELECT %I FROM public.rate_limits WHERE ip = $1 AND date = $2', p_counter)
      INTO v_count USING p_ip, p_date;
    RETURN QUERY SELECT false, coalesce(v_count, p_limit);
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bump_rate_limit(text, date, text, integer) FROM public;
REVOKE ALL ON FUNCTION public.bump_rate_limit(text, date, text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_rate_limit(text, date, text, integer) TO service_role;

COMMENT ON FUNCTION public.bump_rate_limit(text, date, text, integer) IS
  'Atomically consume one slot of a daily counter. Returns (allowed, count): allowed=false means the counter was already at the limit and was NOT incremented.';

-- Give a slot back. Floors at zero so a refund can never mint credit — a
-- request that was denied (and so never consumed) must not be able to
-- "refund" its way to an extra slot.
CREATE OR REPLACE FUNCTION public.refund_rate_limit(
  p_ip text,
  p_date date,
  p_counter text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_counter IS NULL OR p_counter NOT IN (
    'mark_count', 'omni_count', 'contact_count', 'signup_count',
    'teachback_count', 'explain_count', 'search_count', 'question_detail_count'
  ) THEN
    RAISE EXCEPTION 'refund_rate_limit: unknown counter %', p_counter;
  END IF;
  IF p_ip IS NULL OR length(p_ip) = 0 OR length(p_ip) > 128 THEN
    RAISE EXCEPTION 'refund_rate_limit: invalid key';
  END IF;

  EXECUTE format(
    'UPDATE public.rate_limits
       SET %1$I = greatest(%1$I - 1, 0)
     WHERE ip = $1 AND date = $2
     RETURNING %1$I',
    p_counter
  ) INTO v_count USING p_ip, p_date;

  RETURN coalesce(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_rate_limit(text, date, text) FROM public;
REVOKE ALL ON FUNCTION public.refund_rate_limit(text, date, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_rate_limit(text, date, text) TO service_role;

COMMENT ON FUNCTION public.refund_rate_limit(text, date, text) IS
  'Return one slot of a daily counter (floor 0). Used when a run that consumed a slot up front fails before producing anything.';
