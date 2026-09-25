import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

/**
 * Per-IP guard on invite-code guessing.
 *
 * `/api/classrooms/by-code/[code]` and `/api/classrooms/join` both resolve a
 * code to a classroom. The code space is large (31^6, see invite-code.ts) but
 * with thousands of classrooms a scripted caller hitting one every few
 * milliseconds finds a live one in the order of 10^5 requests, and by-code
 * then hands back the class name, subject and roster size. Neither route had
 * any limit. (Code review 2026-09-25, §2 Teacher — invite-code enumeration.)
 *
 * What is counted is FAILED lookups — a well-formed code that matches no
 * classroom — not every request. The invite-code module's own design
 * constraint is "a teacher writes the code on the whiteboard and thirty
 * students on the school Wi-Fi type it in at once": that is sixty requests
 * (preview + join) from one IP in a few minutes, and a cap on all attempts
 * would lock the class out after the tenth student. Enumeration, by
 * definition, is a stream of misses; a class joining is a stream of hits with
 * a handful of typos, so twenty misses an hour per address bounds the one
 * without touching the other.
 *
 * The count lives in `classroom_join_attempts` (one row per miss, keyed by a
 * hash of the address) so it survives deploys and is shared across serverless
 * instances — the in-memory buckets this codebase used to rely on are
 * per-lambda and empty after every cold start. It is deliberately separate
 * from the `rate_limits` day buckets: those are per-day and count every call,
 * and this needs a sliding hour over misses only.
 *
 * Malformed codes (wrong charset) never reach the database and are not
 * counted: they cost nothing and cannot be a guess at a real code.
 */

/** Failed lookups per address per window before further lookups are refused. */
export const JOIN_FAILURES_PER_WINDOW = 20
export const JOIN_FAILURE_WINDOW_SECONDS = 60 * 60

export const JOIN_RATE_LIMIT_MESSAGE =
  'Too many invite-code attempts from this network. Wait an hour and try again, or ask your teacher to check the code.'

/**
 * The address never lands in the table in the clear — same convention as
 * `mark_runs.client_scope` (lib/rate-limit.ts clientScopeKey). The hash only
 * has to be stable for an hour, so it is unsalted and comparable across
 * instances.
 */
export function hashJoinIp(ip: string): string {
  return createHash('sha256').update(ip || 'unknown').digest('hex')
}

/** Start of the sliding window, as an ISO timestamp for the range scan. */
export function joinWindowStart(now: Date = new Date()): string {
  return new Date(now.getTime() - JOIN_FAILURE_WINDOW_SECONDS * 1000).toISOString()
}

/** Pure: is a caller with this many recent misses allowed another lookup? */
export function joinLookupAllowed(
  recentFailures: number,
  limit: number = JOIN_FAILURES_PER_WINDOW
): boolean {
  return recentFailures < limit
}

/** The guard could not be consulted; the route answers 503, not "denied". */
export class JoinGuardUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JoinGuardUnavailableError'
  }
}

/**
 * PostgREST's "no such table" — the migration
 * (supabase/migrations/20260925_classroom_join_attempts.sql) has not reached
 * this database yet. Anything else is a real outage.
 */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  return /relation .* does not exist|could not find the table/i.test(error.message ?? '')
}

let warnedMissingTable = false
function warnMissingTableOnce(): void {
  if (warnedMissingTable) return
  warnedMissingTable = true
  console.warn(
    '[classrooms/join-guard] classroom_join_attempts table missing; invite lookups are unguarded. Apply 20260925_classroom_join_attempts.sql.'
  )
}

export type JoinGuardDecision =
  | { allowed: true; failures: number }
  | { allowed: false; failures: number; message: string }

/**
 * May this address look a code up right now?
 *
 * Read-only: a hit is free, so nothing is recorded here. Pair with
 * `recordJoinFailure` when the lookup misses. Deploy-before-migrate (the table
 * is not there yet) allows the request and warns once — the pre-fix behaviour,
 * for the minutes it takes the migration to land — while any other database
 * error throws, so the route fails as an outage rather than either waving the
 * caller through or lying to a student that they are blocked.
 */
export async function checkJoinGuard(
  supabase: SupabaseClient,
  ip: string,
  now: Date = new Date()
): Promise<JoinGuardDecision> {
  const ipHash = hashJoinIp(ip)
  const { count, error } = await supabase
    .from('classroom_join_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', joinWindowStart(now))

  if (error) {
    if (isMissingTableError(error)) {
      warnMissingTableOnce()
      return { allowed: true, failures: 0 }
    }
    console.error('[classrooms/join-guard] count failed', { message: error.message })
    throw new JoinGuardUnavailableError(`join guard unavailable: ${error.message}`)
  }

  const failures = count ?? 0
  if (!joinLookupAllowed(failures)) {
    return { allowed: false, failures, message: JOIN_RATE_LIMIT_MESSAGE }
  }
  return { allowed: true, failures }
}

/**
 * Record one miss for this address, and drop this address's rows that have
 * aged out of the window so the table stays the size of the last hour rather
 * than the history of every typo. Best-effort and never throws: it runs on
 * the 404 path, where the answer to the student is already decided and a
 * second failure has nothing to add — but it is logged, because a silently
 * failing insert is a guard that is silently off.
 */
export async function recordJoinFailure(
  supabase: SupabaseClient,
  ip: string,
  now: Date = new Date()
): Promise<void> {
  const ipHash = hashJoinIp(ip)
  try {
    const { error } = await supabase
      .from('classroom_join_attempts')
      .insert({ ip_hash: ipHash, created_at: now.toISOString() })
    if (error) {
      if (isMissingTableError(error)) warnMissingTableOnce()
      else console.error('[classrooms/join-guard] record failed', { message: error.message })
      return
    }
    await supabase
      .from('classroom_join_attempts')
      .delete()
      .eq('ip_hash', ipHash)
      .lt('created_at', joinWindowStart(now))
  } catch (err) {
    console.error('[classrooms/join-guard] record threw', err)
  }
}
