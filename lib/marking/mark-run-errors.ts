/**
 * How a `mark_runs` write can fail, and which failure it is.
 *
 * Two failures matter and they must be told apart in the right ORDER:
 *
 *  - a unique violation on (client_scope, client_request_id) — two uploads
 *    with one idempotency key inside the same second. The loser must stop:
 *    release its reservation, refund the guest slot, answer `duplicate: true`.
 *  - a missing optional column — a preview database that has not had a
 *    migration applied. The insert is retried without the column so the run
 *    still leaves telemetry behind.
 *
 * The missing-column check used to be a bare substring test over the column
 * names, and it ran FIRST. Once 20260925_mark_runs_client_scope.sql is
 * applied, the unique index is named `uq_mark_runs_client_scope_request_id`
 * — which contains `client_scope` — so a genuine duplicate (SQLSTATE 23505,
 * "duplicate key value violates unique constraint …") read as "column not
 * migrated", the row was re-inserted WITHOUT client_scope, that insert
 * succeeded (NULL scope is distinct under the index), and both uploads ran
 * and charged. The race the index exists to settle was being un-settled by
 * the fallback meant for a different problem.
 *
 * Pure, so the ordering is a unit test rather than a production incident.
 */

/**
 * Columns added after the table was created. A preview branch whose database
 * has not had the migration applied must not lose the run's telemetry over a
 * missing column, so a write that names one of these is retried without
 * them. Only these: anything else failing is a real error.
 */
export const OPTIONAL_RUN_COLUMNS = [
  'exam_system',
  'reservation_event_id',
  'client_scope',
] as const

export type MarkRunDbError = {
  code?: string | null
  message?: string | null
} | null | undefined

export type MarkRunWriteFailure =
  | 'unique_violation'
  | 'missing_optional_column'
  | 'other'

/** Postgres unique_violation, as PostgREST reports it. */
export function isUniqueViolation(error: MarkRunDbError): boolean {
  if (!error) return false
  return error.code === '23505' || /duplicate key/i.test(error.message ?? '')
}

/**
 * The write named an optional column this database does not have yet.
 *
 * Requires the actual missing-column signature — PostgREST's schema-cache
 * miss (`PGRST204`, "Could not find the 'x' column of 'mark_runs' in the
 * schema cache") or Postgres' own `42703` ("column mark_runs.x does not
 * exist") — AND one of the optional names. The name alone is not enough: it
 * also appears in the unique index's name, and in any constraint or trigger
 * message that happens to mention the column.
 *
 * Accepts a bare message string for callers that only kept the text.
 */
export function isMissingOptionalColumnError(
  error: MarkRunDbError | string
): boolean {
  if (!error) return false
  const code = typeof error === 'string' ? null : (error.code ?? null)
  const message = (typeof error === 'string' ? error : error.message) ?? ''
  if (!message) return false

  const namesOptionalColumn = OPTIONAL_RUN_COLUMNS.some((col) =>
    // Word-bounded so `client_scope` does not match inside
    // `uq_mark_runs_client_scope_request_id`.
    new RegExp(`(^|[^A-Za-z0-9_])${col}([^A-Za-z0-9_]|$)`).test(message)
  )
  if (!namesOptionalColumn) return false

  if (code === 'PGRST204' || code === '42703') return true
  return /column .* does not exist|could not find the '[a-z_]+' column/i.test(
    message
  )
}

/**
 * Classify a failed `mark_runs` write. The unique violation is tested FIRST:
 * it is the idempotency contract doing its job and must never be mistaken
 * for a migration gap (see the module comment).
 */
export function classifyMarkRunWriteError(
  error: MarkRunDbError
): MarkRunWriteFailure {
  if (isUniqueViolation(error)) return 'unique_violation'
  if (isMissingOptionalColumnError(error)) return 'missing_optional_column'
  return 'other'
}
