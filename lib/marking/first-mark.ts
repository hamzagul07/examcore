import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Has this account ever produced a marked attempt?
 *
 * Asked once per run, before the pipeline starts, to decide whether this is the
 * mark that gets the premium treatment (see `hasFirstMarkPremium`). It is a
 * `head: true` count with a limit of 1 — the answer is a boolean, and reading
 * rows to compute it would be the same round trip for more bytes.
 *
 * Must be called with the service client. `attempts` SELECT runs through a
 * policy that calls `teacher_student_ids()`, which an anon-key read cannot
 * execute, so a user-scoped client returns zero rows rather than an error —
 * and zero rows here would silently make every mark somebody's "first".
 *
 * Fails closed: an error means "not first", so a database wobble cannot hand
 * out an unbounded number of premium marks to the same account.
 */
export async function isFirstEverMark(
  service: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count, error } = await service
    .from('attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .limit(1)

  if (error) {
    console.error('[first-mark] attempt lookup failed:', error.message)
    return false
  }

  return (count ?? 0) === 0
}
