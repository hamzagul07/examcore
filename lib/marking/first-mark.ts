import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Has this account ever started a mark?
 *
 * Asked once per run, before the pipeline starts, to decide whether this is the
 * mark that gets the premium treatment (see `hasFirstMarkPremium`). Two
 * `head: true` counts with a limit of 1 — the answer is a boolean, and reading
 * rows to compute it would be the same round trips for more bytes.
 *
 * Both `attempts` AND `mark_runs` are consulted. An attempt row only exists
 * once a mark fully succeeds, so counting attempts alone re-granted the
 * premium every time the first mark failed (or was still running in another
 * tab): the verify pass and the rewrite — the two things the premium pays for —
 * had already been spent on the failed run. A `mark_runs` row is opened before
 * the first model call, so it is the record that the premium was handed out.
 * Runs that ended in `error` are excluded: the student never held a premium
 * result to lose, and the loss frame the premium exists for has nothing to
 * bite on. `running`, `success` and `abandoned` all count.
 *
 * Must be called BEFORE this run's own `mark_runs` row is opened, or every
 * mark counts itself and nobody ever has a first one.
 *
 * Must be called with the service client. `attempts` SELECT runs through a
 * policy that calls `teacher_student_ids()`, which an anon-key read cannot
 * execute, so a user-scoped client returns zero rows rather than an error —
 * and zero rows here would silently make every mark somebody's "first".
 * `mark_runs` has no client policies at all.
 *
 * Fails closed: an error means "not first", so a database wobble cannot hand
 * out an unbounded number of premium marks to the same account.
 */
export async function isFirstEverMark(
  service: SupabaseClient,
  userId: string
): Promise<boolean> {
  const [attempts, runs] = await Promise.all([
    service
      .from('attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .limit(1),
    service
      .from('mark_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .neq('status', 'error')
      .limit(1),
  ])

  if (attempts.error) {
    console.error('[first-mark] attempt lookup failed:', attempts.error.message)
    return false
  }
  if (runs.error) {
    console.error('[first-mark] mark_runs lookup failed:', runs.error.message)
    return false
  }

  return isFirstFromCounts(attempts.count, runs.count)
}

/** Pure: first only when neither table has anything for the account. */
export function isFirstFromCounts(
  attemptCount: number | null | undefined,
  startedRunCount: number | null | undefined
): boolean {
  return (attemptCount ?? 0) === 0 && (startedRunCount ?? 0) === 0
}
