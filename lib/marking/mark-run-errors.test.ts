import assert from 'node:assert/strict'
import {
  classifyMarkRunWriteError,
  isMissingOptionalColumnError,
  isUniqueViolation,
} from './mark-run-errors'

// The bug: once the per-scope index exists, its NAME contains `client_scope`,
// so a duplicate-key error read as "column not migrated" and the loser of a
// same-second race was re-inserted unscoped — and ran, and charged.
const scopedDuplicate = {
  code: '23505',
  message:
    'duplicate key value violates unique constraint "uq_mark_runs_client_scope_request_id"',
}
assert.equal(isUniqueViolation(scopedDuplicate), true)
assert.equal(
  isMissingOptionalColumnError(scopedDuplicate),
  false,
  'an index name that mentions the column is not a missing column'
)
assert.equal(classifyMarkRunWriteError(scopedDuplicate), 'unique_violation')

// The pre-migration global index has no optional-column name in it; it was
// the only reason the old ordering ever worked.
const globalDuplicate = {
  code: '23505',
  message:
    'duplicate key value violates unique constraint "uq_mark_runs_client_request_id"',
}
assert.equal(classifyMarkRunWriteError(globalDuplicate), 'unique_violation')

// Genuine missing columns, in both shapes PostgREST reports them.
const schemaCacheMiss = {
  code: 'PGRST204',
  message: "Could not find the 'client_scope' column of 'mark_runs' in the schema cache",
}
assert.equal(isMissingOptionalColumnError(schemaCacheMiss), true)
assert.equal(classifyMarkRunWriteError(schemaCacheMiss), 'missing_optional_column')

const undefinedColumn = {
  code: '42703',
  message: 'column mark_runs.reservation_event_id does not exist',
}
assert.equal(isMissingOptionalColumnError(undefinedColumn), true)
assert.equal(classifyMarkRunWriteError(undefinedColumn), 'missing_optional_column')

// Code missing (older client, or only the message survived): the message
// signature alone is still enough, and a bare string is accepted.
assert.equal(
  isMissingOptionalColumnError({ message: 'column "exam_system" does not exist' }),
  true
)
assert.equal(
  isMissingOptionalColumnError(
    "Could not find the 'exam_system' column of 'mark_runs' in the schema cache"
  ),
  true
)

// A missing column that is NOT one of ours is a real error, not a retry.
assert.equal(
  isMissingOptionalColumnError({
    code: 'PGRST204',
    message: "Could not find the 'nonsense' column of 'mark_runs' in the schema cache",
  }),
  false
)
// The column name alone, with no missing-column signature, is not a match.
assert.equal(
  isMissingOptionalColumnError({
    code: '23514',
    message: 'new row violates check constraint "client_scope_format"',
  }),
  false
)
assert.equal(isMissingOptionalColumnError(null), false)
assert.equal(isMissingOptionalColumnError(''), false)
assert.equal(isMissingOptionalColumnError({ message: null }), false)

// Anything else is 'other' and surfaces as a plain (swallowed) telemetry error.
assert.equal(classifyMarkRunWriteError({ code: '57014', message: 'canceling statement' }), 'other')
assert.equal(classifyMarkRunWriteError(null), 'other')

// A duplicate that ALSO happens to mention a missing column somehow is still a
// duplicate: the unique violation always wins the ordering.
assert.equal(
  classifyMarkRunWriteError({
    code: '23505',
    message: 'duplicate key value; column client_scope does not exist',
  }),
  'unique_violation'
)

console.log('mark-run-errors: ok')
