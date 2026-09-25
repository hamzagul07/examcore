-- Per-address record of failed invite-code lookups.
--
-- Code review 2026-09-25, §2 Teacher — invite-code enumeration:
-- /api/classrooms/by-code/[code] was unauthenticated with no rate limit and
-- returned the class name, subject and roster size; /api/classrooms/join had
-- no limit either. The code space is 31^6 (lib/teacher/invite-code.ts), but
-- with thousands of classrooms a script finds a live code in ~10^5 requests.
--
-- lib/teacher/join-attempts.ts writes one row here per MISS (a well-formed
-- code that matched nothing) and refuses further lookups from an address with
-- twenty misses in the last hour. Hits are not recorded: a class of thirty on
-- one school IP joining together is sixty successful requests in a few
-- minutes, and a cap on all attempts would lock the room out after the tenth
-- student. Enumeration is a stream of misses; that is what is counted.
--
-- Rows are pruned per address as they age out of the window, by the same
-- code path that inserts, so the table stays the size of the last hour.
--
-- Separate from rate_limits on purpose: those are per-day buckets that count
-- every call, and this needs a sliding hour over misses only. Keeping it
-- apart also means neither migration depends on the other.
--
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.classroom_join_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- sha256 hex of the client address; the raw IP never lands here.
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT classroom_join_attempts_ip_hash_len CHECK (length(ip_hash) BETWEEN 16 AND 128)
);

-- The guard's only two queries are "misses for this address since T" and
-- "delete this address's rows before T": both are range scans on this index.
CREATE INDEX IF NOT EXISTS idx_classroom_join_attempts_ip_time
  ON public.classroom_join_attempts (ip_hash, created_at DESC);

COMMENT ON TABLE public.classroom_join_attempts IS
  'One row per failed invite-code lookup (unknown code), keyed by a hash of the caller''s address. Read and written only by the service role (lib/teacher/join-attempts.ts); pruned per address as rows age past the hour window.';
COMMENT ON COLUMN public.classroom_join_attempts.ip_hash IS
  'sha256 hex of the client IP. Unsalted: it only has to be stable for an hour and comparable across instances.';

-- Service-role only. The row count is the whole guard, so a client that could
-- read it would learn how close it is to the limit, and one that could delete
-- from it would reset its own counter. RLS deny-all for both client roles,
-- and the table privileges revoked outright as well, so the audit
-- (audit_client_grants, service-only-table check) has nothing to find even
-- on a database where PUBLIC carries default grants.
ALTER TABLE public.classroom_join_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS classroom_join_attempts_service_only ON public.classroom_join_attempts;
CREATE POLICY classroom_join_attempts_service_only
  ON public.classroom_join_attempts
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.classroom_join_attempts FROM PUBLIC;
REVOKE ALL ON TABLE public.classroom_join_attempts FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.classroom_join_attempts TO service_role;
