import assert from 'node:assert/strict'
import {
  attemptHref,
  attemptWorkLabel,
  collapseDailyRows,
  feedbackNotificationCopy,
  namesSummary,
  publishedNotificationCopy,
  reviewNotificationCopy,
  studentSetHref,
  submissionNotificationCopy,
  submissionNotificationsOff,
  teacherSetHref,
  utcDayStart,
} from '@/lib/teacher/notify'

// --- the coalescing key: one teacher notification per set per UTC day ---------

assert.equal(utcDayStart(new Date('2026-09-25T23:59:59.999Z')).toISOString(), '2026-09-25T00:00:00.000Z')
assert.equal(utcDayStart(new Date('2026-09-26T00:00:00.000Z')).toISOString(), '2026-09-26T00:00:00.000Z')
// A teacher in UTC+5 at 04:30 local on the 26th is still on the 25th's row: the
// day is UTC, like every cron and week boundary in the teacher system.
assert.equal(utcDayStart(new Date('2026-09-25T23:30:00+00:00')).toISOString(), '2026-09-25T00:00:00.000Z')

assert.equal(teacherSetHref('c1', 'a1'), '/teacher/classroom/c1/assignments/a1')
assert.equal(studentSetHref('a1'), '/dashboard/assignments/a1')
assert.equal(attemptHref('t1'), '/dashboard/attempt/t1')

{
  // Newest row survives; every other row for the key is removed.
  const rows = [
    { id: 'b', created_at: '2026-09-25T09:00:00Z' },
    { id: 'c', created_at: '2026-09-25T11:00:00Z' },
    { id: 'a', created_at: '2026-09-25T10:00:00Z' },
  ]
  assert.deepEqual(collapseDailyRows(rows), { keep: 'c', remove: ['a', 'b'] })
  // Two racing inserts in the same instant: both racers must pick the SAME
  // survivor, so the tie is broken by id, not by array order.
  const tie = [
    { id: 'x1', created_at: '2026-09-25T10:00:00Z' },
    { id: 'x2', created_at: '2026-09-25T10:00:00Z' },
  ]
  assert.deepEqual(collapseDailyRows(tie), collapseDailyRows([...tie].reverse()))
  assert.equal(collapseDailyRows(tie).keep, 'x2')
  assert.deepEqual(collapseDailyRows([]), { keep: null, remove: [] })
}

// --- notify_submissions -------------------------------------------------------

assert.equal(submissionNotificationsOff({ notify_submissions: 'off' }), true)
assert.equal(submissionNotificationsOff({ notify_submissions: 'daily' }), false)
assert.equal(submissionNotificationsOff({}), false, 'default is on (daily)')
assert.equal(submissionNotificationsOff(null), false)

// --- copy ------------------------------------------------------------------------

{
  const one = submissionNotificationCopy({ title: 'Integration drill', names: ['Amira K.'], count: 1 })
  assert.equal(one.title, 'Amira K. handed in Integration drill')

  const many = submissionNotificationCopy({
    title: 'Integration drill',
    names: ['Amira K.', 'Ben T.'],
    count: 5,
  })
  assert.equal(many.title, '5 students handed in Integration drill today')
  assert.equal(many.body, 'Amira K., Ben T. and 3 more')

  // A title is the teacher's text: one line, bounded, whatever they typed.
  const hostile = submissionNotificationCopy({ title: 'Set\nwith\r\nbreaks' + 'x'.repeat(200), names: [], count: 1 })
  assert.doesNotMatch(hostile.title, /[\r\n]/)
  assert.ok(hostile.title.length < 140)
  assert.match(hostile.title, /^A student handed in/)
}

assert.equal(namesSummary(['Amira K.'], 1), 'Amira K.')
assert.equal(namesSummary(['Amira K.', 'Ben T.'], 2), 'Amira K. and Ben T.')
assert.equal(namesSummary(['Amira K.', 'Ben T.', 'Chen L.'], 3), 'Amira K., Ben T. and Chen L.')
assert.equal(namesSummary([], 4), '4 students')

{
  const copy = publishedNotificationCopy({
    title: 'Vectors',
    teacherName: 'Sarah K.',
    className: 'Year 13 Maths',
    dueAt: '2026-10-02T16:00:00Z',
    now: new Date('2026-09-25T12:00:00Z'),
  })
  assert.equal(copy.title, 'New set: Vectors')
  assert.equal(copy.body, 'Sarah K. · Year 13 Maths · Due Fri 2 Oct, 16:00 UTC')
  const noDue = publishedNotificationCopy({
    title: 'Vectors',
    teacherName: 'Sarah K.',
    className: 'Year 13 Maths',
    dueAt: null,
    now: new Date('2026-09-25T12:00:00Z'),
  })
  assert.equal(noDue.body, 'Sarah K. · Year 13 Maths')
}

// --- what the work is called ----------------------------------------------------

assert.equal(attemptWorkLabel({ setTitle: 'Vectors drill', paperCode: '9709/12', questionNumber: '3' }), 'Vectors drill')
assert.equal(attemptWorkLabel({ paperCode: '9709/12', questionNumber: '3' }), '9709/12 Q3')
assert.equal(attemptWorkLabel({ paperCode: '9709/12', questionNumber: 'Q3' }), '9709/12 Q3', 'no double Q')
assert.equal(attemptWorkLabel({ paperCode: '9709/12' }), '9709/12')
assert.equal(attemptWorkLabel({}), null)

{
  const override = reviewNotificationCopy({
    decision: 'override',
    teacherName: 'Sarah K.',
    workLabel: '9709/12 Q3',
    marksBefore: 6,
    marksAfter: 7,
    totalMarks: 9,
  })
  assert.equal(override.title, 'Sarah K. re-marked 9709/12 Q3')
  assert.equal(override.body, 'Now 6 → 7/9. See every mark.')

  const unknownBefore = reviewNotificationCopy({
    decision: 'override',
    teacherName: 'Sarah K.',
    workLabel: null,
    marksBefore: null,
    marksAfter: 7,
    totalMarks: 9,
  })
  assert.equal(unknownBefore.body, 'Now 7/9. See every mark.', 'the old mark is never guessed')
  assert.match(unknownBefore.title, /your answer$/)

  const confirm = reviewNotificationCopy({
    decision: 'confirm',
    teacherName: 'Sarah K.',
    workLabel: 'Vectors drill',
    marksBefore: 7,
    marksAfter: 7,
    totalMarks: 9,
  })
  assert.equal(confirm.title, 'Sarah K. checked your mark on Vectors drill')
  assert.equal(confirm.body, 'Your 7/9 stands.')
}

{
  const fb = feedbackNotificationCopy({
    teacherName: 'Sarah K.',
    workLabel: 'Vectors drill',
    body: 'Good method.\n\nCheck the sign in part (b) — ' + 'detail '.repeat(40),
  })
  assert.equal(fb.title, 'Sarah K. left feedback on Vectors drill')
  assert.doesNotMatch(fb.body, /\n/)
  assert.ok(fb.body.length <= 140)
  assert.match(fb.body, /^Good method\. Check the sign/)
}

console.log('notify.test.ts — all assertions passed')
