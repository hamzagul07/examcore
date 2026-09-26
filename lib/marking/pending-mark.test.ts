import assert from 'node:assert/strict'
import {
  FINISHED_MARK_TTL_MS,
  GUEST_MARK_OWNER,
  PENDING_MARK_TTL_MS,
  isMarkRecordOwnedBy,
  markOwnerFor,
  parseFinishedMark,
  parsePendingMark,
} from './pending-mark'

// Owner keys: a user id is itself, anything else is the guest bucket.
assert.equal(markOwnerFor('user-1'), 'user-1')
assert.equal(markOwnerFor(null), GUEST_MARK_OWNER)
assert.equal(markOwnerFor(undefined), GUEST_MARK_OWNER)
assert.equal(markOwnerFor('   '), GUEST_MARK_OWNER)

// Ownership is exact, and a record without an owner belongs to nobody — that
// is the shared-machine leak this exists to close.
assert.equal(isMarkRecordOwnedBy({ owner: 'user-1' }, 'user-1'), true)
assert.equal(isMarkRecordOwnedBy({ owner: 'user-2' }, 'user-1'), false)
assert.equal(isMarkRecordOwnedBy({ owner: 'user-1' }, GUEST_MARK_OWNER), false)
assert.equal(isMarkRecordOwnedBy({}, 'user-1'), false)
assert.equal(isMarkRecordOwnedBy({ owner: null }, 'user-1'), false)
assert.equal(isMarkRecordOwnedBy(null, 'user-1'), false)

const now = 1_700_000_000_000

// Pending: shape, expiry, and a legacy record with no owner.
{
  const rec = parsePendingMark(
    JSON.stringify({ markRunId: 'run-1', startedAt: now - 1000, owner: 'user-1' }),
    now
  )
  assert.ok(rec)
  assert.equal(rec.markRunId, 'run-1')
  assert.equal(rec.owner, 'user-1')
  assert.equal(
    parsePendingMark(
      JSON.stringify({ markRunId: 'run-1', startedAt: now - PENDING_MARK_TTL_MS - 1 }),
      now
    ),
    null,
    'expired pending record'
  )
  const legacy = parsePendingMark(JSON.stringify({ markRunId: 'r', startedAt: now }), now)
  assert.ok(legacy)
  assert.equal(isMarkRecordOwnedBy(legacy, 'user-1'), false, 'legacy record is nobody\'s')
  assert.equal(parsePendingMark('not json', now), null)
  assert.equal(parsePendingMark(JSON.stringify({ startedAt: now }), now), null)
  assert.equal(parsePendingMark(null, now), null)
}

// Finished: same rules.
{
  const rec = parseFinishedMark(
    JSON.stringify({
      markRunId: 'run-1',
      attemptId: 'att-1',
      marksEarned: 7,
      totalMarks: 10,
      ok: true,
      finishedAt: now - 5000,
      owner: 'user-1',
    }),
    now
  )
  assert.ok(rec)
  assert.equal(rec.attemptId, 'att-1')
  assert.equal(rec.ok, true)
  assert.equal(isMarkRecordOwnedBy(rec, 'user-2'), false)
  assert.equal(
    parseFinishedMark(
      JSON.stringify({ markRunId: 'r', finishedAt: now - FINISHED_MARK_TTL_MS - 1, ok: true }),
      now
    ),
    null,
    'expired finished record'
  )
  const noOk = parseFinishedMark(JSON.stringify({ markRunId: 'r', finishedAt: now }), now)
  assert.ok(noOk)
  assert.equal(noOk.ok, false)
  assert.equal(noOk.owner, '')
}

console.log('pending-mark: ok')
