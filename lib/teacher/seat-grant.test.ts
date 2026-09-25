import assert from 'node:assert/strict'
import {
  DECLINE_REASON_MIN,
  SEAT_REASON_MAX,
  approvalReason,
  decodeSeatCursor,
  encodeSeatCursor,
  parseSeatDecisionBody,
  parseSeatStatus,
  planSeatDecision,
  seatCardState,
} from '@/lib/teacher/seat-grant'

const REQ = '0b7a3f1c-2d4e-4f5a-9b6c-7d8e9f0a1b2c'
const request = { status: 'pending' as const, school_name: 'Karachi Grammar School', school_email: 'head@kgs.edu.pk' }

// --- parsing the admin's decision -----------------------------------------------

{
  const r = parseSeatDecisionBody({ request_id: REQ, action: 'approve' })
  assert.ok(r.ok)
  assert.deepEqual(r.decision, { requestId: REQ, action: 'approve', reason: '' }, 'approval may omit a reason')
}
{
  const r = parseSeatDecisionBody({ request_id: REQ.toUpperCase(), action: 'decline', reason: '  Use your <b>school</b> email  ' })
  assert.ok(r.ok)
  assert.equal(r.decision.requestId, REQ, 'ids are normalised')
  assert.equal(r.decision.reason, 'Use your school email', 'reasons are stored as plain text')
}
for (const [body, field] of [
  [{ action: 'approve' }, 'request_id'],
  [{ request_id: 'x', action: 'approve' }, 'request_id'],
  [{ request_id: REQ, action: 'grant' }, 'action'],
  [{ request_id: REQ, action: 'decline' }, 'reason'],
  [{ request_id: REQ, action: 'decline', reason: 'no' }, 'reason'],
  [{ request_id: REQ, action: 'decline', reason: '<i></i>' }, 'reason'],
  [{ request_id: REQ, action: 'approve', reason: 'x'.repeat(SEAT_REASON_MAX + 1) }, 'reason'],
  [{ request_id: REQ, action: 'approve', reason: 12 }, 'reason'],
] as const) {
  const r = parseSeatDecisionBody(body)
  assert.equal(r.ok, false, `refused ${JSON.stringify(body)}`)
  if (!r.ok) assert.equal(r.field, field)
}
assert.equal(parseSeatDecisionBody(null).ok, false)
assert.equal(parseSeatDecisionBody([]).ok, false)

assert.equal(parseSeatStatus(null), 'pending', 'the queue is the default view')
assert.equal(parseSeatStatus('declined'), 'declined')
assert.equal(parseSeatStatus('everything'), null)

// --- the plan ------------------------------------------------------------------------

assert.equal(approvalReason(request, ''), 'request: Karachi Grammar School (head@kgs.edu.pk)', 'never an empty audit reason')
assert.equal(approvalReason(request, ' outreach: Harrow '), 'outreach: Harrow')

{
  const r = planSeatDecision(request, { action: 'approve', reason: '' }, { teacherCap: 300 })
  assert.ok(r.ok)
  assert.deepEqual(r.plan.close, { status: 'approved', reviewed_reason: 'request: Karachi Grammar School (head@kgs.edu.pk)' })
  assert.deepEqual(r.plan.grant, { teacher_verified_reason: 'request: Karachi Grammar School (head@kgs.edu.pk)' })
  assert.equal(r.plan.email, 'approved')
  assert.equal(r.plan.notification.type, 'seat_decision')
  assert.match(r.plan.notification.title, /300 marks a month/)
  assert.equal(r.plan.notification.href, '/teacher/dashboard')
}
{
  const reason = 'Please apply with your school email address.'
  const r = planSeatDecision(request, { action: 'decline', reason }, { teacherCap: 300 })
  assert.ok(r.ok)
  assert.equal(r.plan.grant, null, 'a decline never touches the profile')
  assert.deepEqual(r.plan.close, { status: 'declined', reviewed_reason: reason }, 'the teacher sees exactly what was typed')
  assert.equal(r.plan.email, 'declined')
}
{
  const r = planSeatDecision(request, { action: 'decline', reason: 'x'.repeat(DECLINE_REASON_MIN - 1) }, { teacherCap: 300 })
  assert.equal(r.ok, false, 'the plan re-checks the decline reason, whoever called it')
}
for (const status of ['approved', 'declined'] as const) {
  const r = planSeatDecision({ ...request, status }, { action: 'approve', reason: '' }, { teacherCap: 300 })
  assert.equal(r.ok, false, `a ${status} request cannot be decided again`)
  if (!r.ok) assert.match(r.error, new RegExp(status))
}

// --- the desk card ---------------------------------------------------------------------

assert.deepEqual(seatCardState({ verifiedAt: '2026-09-01T00:00:00Z', latest: null }), { kind: 'hidden' })
assert.deepEqual(
  seatCardState({
    verifiedAt: '2026-09-01T00:00:00Z',
    latest: { status: 'declined', reviewed_reason: 'old', reviewed_at: '2026-08-01T00:00:00Z' },
  }),
  { kind: 'hidden' },
  'a verified teacher never sees an old decline'
)
assert.deepEqual(seatCardState({ verifiedAt: null, latest: null }), { kind: 'none' })
assert.deepEqual(
  seatCardState({ verifiedAt: null, latest: { status: 'pending', reviewed_reason: null, reviewed_at: null } }),
  { kind: 'pending' }
)
assert.deepEqual(
  seatCardState({
    verifiedAt: null,
    latest: { status: 'declined', reviewed_reason: 'Use your school email', reviewed_at: '2026-09-20T00:00:00Z' },
  }),
  { kind: 'declined', reason: 'Use your school email', reviewedAt: '2026-09-20T00:00:00Z' }
)
assert.deepEqual(
  seatCardState({
    verifiedAt: null,
    latest: { status: 'approved', reviewed_reason: 'x', reviewed_at: '2026-09-20T00:00:00Z' },
  }),
  { kind: 'none' },
  'approved but since revoked: ask again'
)

// --- cursor ----------------------------------------------------------------------------

{
  const c = { created_at: '2026-09-25T10:00:00.5+00:00', id: REQ }
  assert.deepEqual(decodeSeatCursor(encodeSeatCursor(c)), c)
  assert.equal(decodeSeatCursor('%%%'), null)
  assert.equal(
    decodeSeatCursor(Buffer.from(JSON.stringify(['2026-09-25T10:00:00Z",status.eq.approved', REQ])).toString('base64url')),
    null,
    'no filter injection through the cursor'
  )
}

console.log('seat-grant.test.ts — all assertions passed')
