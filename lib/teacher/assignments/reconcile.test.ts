import assert from 'node:assert/strict'
import {
  RECONCILE_MIN_INTERVAL_MS,
  attemptMatchesItem,
  collectSubmissionCells,
  isNewOrImproved,
  mergeSubmission,
  planSubmissions,
  reconcileIsFresh,
  submissionChanged,
  submissionWindow,
  toCandidate,
  type ReconcileAttemptRow,
  type SetForReconcile,
} from '@/lib/teacher/assignments/reconcile'
import type { AssignmentItem, AssignmentSubmission } from '@/lib/teacher/types'

// --- fixtures -----------------------------------------------------------------

const SET_ID = '00000000-0000-4000-8000-00000000a001'
const STUDENT = '00000000-0000-4000-8000-0000000000b1'
const OTHER = '00000000-0000-4000-8000-0000000000c2'
const SCHEME_Q3 = '00000000-0000-4000-8000-00000000e003'
const SCHEME_Q3_DUP = '00000000-0000-4000-8000-00000000e033'

const set: SetForReconcile = {
  id: SET_ID,
  published_at: '2026-09-21T08:00:00.000Z',
  due_at: '2026-09-25T16:00:00.000Z',
  closed_at: null,
  settings: {},
}

function item(over: Partial<AssignmentItem> = {}): AssignmentItem {
  return {
    id: '00000000-0000-4000-8000-00000000d001',
    assignment_id: SET_ID,
    position: 0,
    item_type: 'past_paper_question',
    mark_scheme_id: SCHEME_Q3,
    paper_code: '9709/12',
    paper_session: 'May/June 2024',
    question_number: '3',
    total_marks: 6,
    syllabus_tags: ['1.2'],
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
    ...over,
  }
}

let seq = 0
function attempt(over: Partial<ReconcileAttemptRow> = {}): ReconcileAttemptRow {
  seq += 1
  return {
    id: `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    user_id: STUDENT,
    created_at: '2026-09-22T10:00:00.000Z',
    marks_earned: 4,
    total_marks: 6,
    mark_scheme_id: SCHEME_Q3,
    assignment_item_id: null,
    mark_schemes: { paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3' },
    ...over,
  }
}

function stored(over: Partial<AssignmentSubmission> = {}): AssignmentSubmission {
  return {
    id: '00000000-0000-4000-8000-00000000f001',
    assignment_id: SET_ID,
    item_id: item().id,
    student_id: STUDENT,
    attempt_id: null,
    attempt_count: 1,
    marks_earned: 3,
    total_marks: 6,
    status: 'submitted',
    source: 'reconciled',
    first_submitted_at: '2026-09-22T09:00:00.000Z',
    last_submitted_at: '2026-09-22T09:00:00.000Z',
    ...over,
  }
}

const roster = [{ student_id: STUDENT, joined_at: '2026-09-01T00:00:00.000Z' }]
const noExtensions = new Map<string, string | null>()

// --- toCandidate: what can hand anything in -----------------------------------

assert.ok(toCandidate(attempt()), 'a marked banked question is a candidate')
assert.equal(toCandidate(attempt({ user_id: null })), null, 'a guest attempt has no author to hand in for')
assert.equal(toCandidate(attempt({ total_marks: 0 })), null, 'a zero total is not a mark')
assert.equal(toCandidate(attempt({ marks_earned: null })), null, 'no score, no hand-in')
assert.equal(toCandidate(attempt({ created_at: 'yesterday' })), null, 'an unreadable timestamp cannot be placed')
assert.equal(
  toCandidate(attempt({ mark_scheme_id: null, am_phase: 'marking', am_paper_code: '9709/12', am_paper_session: 'May/June 2024' })),
  null,
  'a whole paper still being marked (init wrote 0/0 and a job phase) is not handed in'
)
assert.equal(toCandidate(attempt({ marks_earned: '5', total_marks: '6' }))?.marks_earned, 5, 'numeric strings are read')
const wholeDone = toCandidate(
  attempt({
    mark_scheme_id: null,
    mark_schemes: null,
    am_upload_mode: 'whole_paper',
    am_paper_code: '9709/12',
    am_paper_session: 'May/June 2024',
    marks_earned: 50,
    total_marks: 75,
  })
)
assert.equal(wholeDone?.paper_key, 'p:9709/12|May/June 2024', 'a finished whole paper carries its paper key')
assert.equal(
  toCandidate(attempt({ mark_scheme_id: null, mark_schemes: null, am_paper_code: '9709/12', am_paper_session: 'May/June 2024' }))
    ?.paper_key,
  null,
  'a single-question result that happens to name a paper is not a whole paper'
)

// --- attemptMatchesItem: the reconciliation order ------------------------------

const q3 = item()
const c = (over: Partial<ReconcileAttemptRow>) => toCandidate(attempt(over))!
assert.equal(attemptMatchesItem(c({ assignment_item_id: q3.id }), q3), 'linked', '1. the stamp')
assert.equal(attemptMatchesItem(c({}), q3), 'reconciled', '2. the same banked question')
assert.equal(
  attemptMatchesItem(c({ mark_scheme_id: SCHEME_Q3_DUP }), q3),
  'reconciled',
  '3. a second bank row for the same question matches by key'
)
const legacy = item({ mark_scheme_id: null })
assert.equal(
  attemptMatchesItem(c({ mark_scheme_id: SCHEME_Q3_DUP }), legacy),
  'reconciled',
  '3. an item whose scheme row was deleted (FK set null) still matches by paper|session|question'
)
assert.equal(
  attemptMatchesItem(
    c({ mark_scheme_id: '00000000-0000-4000-8000-00000000e004', mark_schemes: { paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '4' } }),
    q3
  ),
  null,
  'another question does not match'
)
assert.equal(
  attemptMatchesItem(c({ mark_scheme_id: null, mark_schemes: null }), legacy),
  null,
  'an attempt with no banked question cannot match a legacy item'
)
const paperItem = item({
  id: '00000000-0000-4000-8000-00000000d002',
  item_type: 'whole_paper',
  mark_scheme_id: null,
  question_number: null,
  total_marks: 75,
})
assert.equal(attemptMatchesItem(wholeDone!, paperItem), 'reconciled', '4. the same whole paper')
assert.equal(attemptMatchesItem(c({}), paperItem), null, 'one question is not the whole paper')
const promptItem = item({
  id: '00000000-0000-4000-8000-00000000d003',
  item_type: 'prompt',
  mark_scheme_id: null,
  paper_code: null,
  paper_session: null,
  question_number: null,
  prompt_text: 'Explain why…',
})
assert.equal(attemptMatchesItem(c({ mark_scheme_id: null, mark_schemes: null }), promptItem), null, 'prompts have no key')
assert.equal(
  attemptMatchesItem(c({ mark_scheme_id: null, mark_schemes: null, assignment_item_id: promptItem.id }), promptItem),
  'linked',
  'prompts match by stamp only'
)

// --- submissionWindow ----------------------------------------------------------

assert.equal(submissionWindow({ ...set, published_at: null }, roster[0].joined_at), null, 'nothing counts for a draft')
assert.deepEqual(
  submissionWindow(set, '2026-09-23T00:00:00.000Z'),
  { from: Date.parse('2026-09-23T00:00:00.000Z'), to: null },
  'a student who joined after publication counts from joining'
)
assert.deepEqual(
  submissionWindow(set, roster[0].joined_at),
  { from: Date.parse(set.published_at!), to: null },
  'otherwise from publication; late work allowed by default'
)
assert.equal(
  submissionWindow({ ...set, settings: { allow_late: false } }, roster[0].joined_at)?.to,
  Date.parse('2026-10-02T16:00:00.000Z'),
  'refusing late work closes the window at the effective close (due + 7 days)'
)

// --- planSubmissions over a set -------------------------------------------------

const base = { assignment: set, items: [q3], roster, extensions: noExtensions, existing: [] as AssignmentSubmission[] }

{
  const plans = planSubmissions({ ...base, attempts: [attempt()] })
  assert.equal(plans.length, 1, 'a plain /mark on the question becomes a hand-in')
  assert.equal(plans[0].next.source, 'reconciled')
  assert.equal(plans[0].next.status, 'submitted')
  assert.equal(plans[0].next.attempt_count, 1)
}

{
  const before = attempt({ created_at: '2026-09-20T10:00:00.000Z', marks_earned: 6 })
  assert.equal(planSubmissions({ ...base, attempts: [before] }).length, 0, 'work before the set was published does not count')
}

{
  const lateJoiner = [{ student_id: STUDENT, joined_at: '2026-09-23T00:00:00.000Z' }]
  const early = attempt({ created_at: '2026-09-22T10:00:00.000Z' })
  assert.equal(
    planSubmissions({ ...base, roster: lateJoiner, attempts: [early] }).length,
    0,
    'work before the student joined the class does not count'
  )
}

{
  const stranger = attempt({ user_id: OTHER })
  assert.equal(planSubmissions({ ...base, attempts: [stranger] }).length, 0, 'students off the roster are never written')
}

{
  const late = attempt({ created_at: '2026-09-26T10:00:00.000Z' })
  const plans = planSubmissions({ ...base, attempts: [late] })
  assert.equal(plans[0].next.status, 'late', 'handed in after the due date is late (isLate)')
  const extended = planSubmissions({
    ...base,
    extensions: new Map([[STUDENT, '2026-09-27T16:00:00.000Z']]),
    attempts: [late],
  })
  assert.equal(extended[0].next.status, 'submitted', 'an extension moves the deadline')
}

{
  const afterClose = attempt({ created_at: '2026-10-05T10:00:00.000Z' })
  assert.equal(planSubmissions({ ...base, attempts: [afterClose] })[0].next.status, 'late', 'late work is accepted by default')
  assert.equal(
    planSubmissions({ ...base, assignment: { ...set, settings: { allow_late: false } }, attempts: [afterClose] }).length,
    0,
    'unless the set refuses late work'
  )
}

{
  const a = attempt({ marks_earned: 2, created_at: '2026-09-22T10:00:00.000Z' })
  const b = attempt({ marks_earned: 5, created_at: '2026-09-23T10:00:00.000Z' })
  const d = attempt({ marks_earned: 3, created_at: '2026-09-24T10:00:00.000Z', assignment_item_id: q3.id })
  const [plan] = planSubmissions({ ...base, attempts: [a, b, d] })
  assert.equal(plan.next.attempt_id, b.id, 'the best attempt is kept')
  assert.equal(plan.next.marks_earned, 5)
  assert.equal(plan.next.attempt_count, 3, 'every attempt counts toward attempt_count')
  assert.equal(plan.next.first_submitted_at, '2026-09-22T10:00:00.000Z', 'first hand-in is the earliest')
  assert.equal(plan.next.last_submitted_at, '2026-09-24T10:00:00.000Z', 'last hand-in is the latest')
  assert.equal(plan.next.source, 'linked', 'any stamped attempt makes the row linked')
}

{
  const dup = attempt()
  const plans = planSubmissions({ ...base, attempts: [dup, { ...dup }] })
  assert.equal(plans[0].next.attempt_count, 1, 'the same attempt read twice (stamp + scheme queries) counts once')
}

{
  const legacyPlans = planSubmissions({
    ...base,
    items: [legacy],
    attempts: [attempt({ mark_scheme_id: SCHEME_Q3_DUP })],
  })
  assert.equal(legacyPlans.length, 1, 'fixture: legacy item with null mark_scheme_id is reconciled by key')
}

{
  const multi = planSubmissions({
    ...base,
    items: [q3, paperItem],
    attempts: [
      attempt(),
      attempt({
        mark_scheme_id: null,
        mark_schemes: null,
        am_upload_mode: 'whole_paper',
        am_paper_code: '9709/12',
        am_paper_session: 'May/June 2024',
        marks_earned: 60,
        total_marks: 75,
      }),
    ],
  })
  assert.deepEqual(
    multi.map((p) => p.item.id).sort(),
    [q3.id, paperItem.id].sort(),
    'each item gets its own row'
  )
}

// --- mergeSubmission: against the stored row -------------------------------------

const ctx = { assignment: set, item: q3, studentId: STUDENT, extendedDueAt: null }

{
  const held = stored({ attempt_id: 'held-attempt', marks_earned: 5, status: 'reviewed' })
  const worse = toCandidate(attempt({ marks_earned: 3, created_at: '2026-09-23T10:00:00.000Z' }))!
  const next = mergeSubmission(held, [{ candidate: worse, via: 'reconciled' }], ctx)!
  assert.equal(next.attempt_id, 'held-attempt', 'a worse retry does not replace the best')
  assert.equal(next.status, 'reviewed', 'the teacher’s review survives while its attempt is still the best')
  assert.equal(next.attempt_count, 2, 'but it is counted')
  assert.equal(next.first_submitted_at, '2026-09-22T09:00:00.000Z', 'first hand-in never moves later')
  assert.equal(isNewOrImproved(held, next), false, 'and it is not news')
}

{
  const held = stored({ attempt_id: 'held-attempt', marks_earned: 3, status: 'reviewed' })
  const better = toCandidate(attempt({ marks_earned: 6, created_at: '2026-09-23T10:00:00.000Z' }))!
  const next = mergeSubmission(held, [{ candidate: better, via: 'reconciled' }], ctx)!
  assert.equal(next.attempt_id, better.id, 'a better attempt takes over')
  assert.equal(next.status, 'submitted', 'and is no longer "reviewed" — nobody has reviewed it')
  assert.equal(isNewOrImproved(held, next), true, 'an improvement is news')
}

{
  const tie = toCandidate(attempt({ marks_earned: 3, created_at: '2026-09-23T10:00:00.000Z' }))!
  const held = stored({ attempt_id: 'held-attempt', marks_earned: 3, status: 'reviewed' })
  const next = mergeSubmission(held, [{ candidate: tie, via: 'reconciled' }], ctx)!
  assert.equal(next.attempt_id, 'held-attempt', 'on a tie the held attempt stays, so its review is not lost')
}

{
  // The held attempt has been overridden down (attempts.marks_earned changed).
  const heldId = attempt({ marks_earned: 2, created_at: '2026-09-22T09:00:00.000Z' })
  const other = attempt({ marks_earned: 4, created_at: '2026-09-23T10:00:00.000Z' })
  const held = stored({ attempt_id: heldId.id, marks_earned: 5, attempt_count: 2, last_submitted_at: '2026-09-23T10:00:00.000Z' })
  const next = mergeSubmission(
    held,
    [
      { candidate: toCandidate(heldId)!, via: 'reconciled' },
      { candidate: toCandidate(other)!, via: 'reconciled' },
    ],
    ctx
  )!
  assert.equal(next.attempt_id, other.id, 'overridden marks count for best-of (read from attempts, not the stored row)')
  assert.equal(next.attempt_count, 2, 'a full recount does not inflate the count')
}

{
  const held = stored({ attempt_count: 3, last_submitted_at: '2026-09-23T10:00:00.000Z', attempt_id: 'held-attempt' })
  const again = toCandidate(attempt({ created_at: '2026-09-23T10:00:00.000Z' }))!
  const next = mergeSubmission(held, [{ candidate: again, via: 'linked' }], ctx)!
  assert.equal(next.attempt_count, 3, 'an attempt no newer than the last hand-in was already counted (idempotent hook)')
  assert.equal(next.source, 'linked')
  const newer = toCandidate(attempt({ created_at: '2026-09-24T10:00:00.000Z' }))!
  assert.equal(
    mergeSubmission(held, [{ candidate: newer, via: 'linked' }], ctx)!.attempt_count,
    4,
    'a newer one is added to the count'
  )
}

{
  // The stored attempt was deleted (attempt_id set null) — its marks are kept.
  const held = stored({ attempt_id: null, marks_earned: 6 })
  const worse = toCandidate(attempt({ marks_earned: 1 }))!
  const next = mergeSubmission(held, [{ candidate: worse, via: 'reconciled' }], ctx)!
  assert.equal(next.marks_earned, 6, 'nothing regresses when the best attempt is no longer readable')
}

assert.equal(mergeSubmission(stored(), [], ctx), null, 'no matching attempt: the stored row is left exactly as it is')

// --- change detection and freshness -------------------------------------------------

{
  const a = toCandidate(attempt())!
  const next = mergeSubmission(null, [{ candidate: a, via: 'reconciled' }], ctx)!
  assert.equal(submissionChanged(null, next), true, 'a new row is a change')
  const same = { ...next, id: 'x', first_submitted_at: '2026-09-22T10:00:00+00:00', last_submitted_at: next.last_submitted_at }
  assert.equal(submissionChanged(same as AssignmentSubmission, next), false, 'the same instant in another format is not a change')
  assert.equal(submissionChanged({ ...(same as AssignmentSubmission), marks_earned: 3 }, next), true)
}

{
  const cells = collectSubmissionCells({ ...base, items: [], attempts: [attempt()] })
  assert.equal(cells.length, 0, 'a set with no items has nothing to hand in')
}

const now = new Date('2026-09-25T12:00:00.000Z')
assert.equal(reconcileIsFresh(null, now), false, 'never reconciled: go')
assert.equal(reconcileIsFresh(new Date(now.getTime() - 30_000).toISOString(), now), true, 'under a minute ago: skip')
assert.equal(reconcileIsFresh(new Date(now.getTime() - RECONCILE_MIN_INTERVAL_MS).toISOString(), now), false, 'a minute: go')
assert.equal(reconcileIsFresh(new Date(now.getTime() - 30_000).toISOString(), now, true), false, 'forced: go')
assert.equal(reconcileIsFresh(new Date(now.getTime() + 60_000).toISOString(), now), false, 'a stamp from the future does not block forever')

console.log('reconcile.test.ts: all checks passed')
