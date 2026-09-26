import assert from 'node:assert/strict'
import { buildAssignmentDueEmail, relativeDue } from '@/lib/email/assignment-due'

const NOW = new Date('2026-09-25T16:00:00Z')
const HOUR = 3_600_000
const at = (h: number) => new Date(NOW.getTime() + h * HOUR).toISOString()

// --- how far away the deadline is ---------------------------------------------------------

assert.equal(relativeDue(at(0.5), NOW), 'in under an hour')
assert.equal(relativeDue(at(1), NOW), 'in 1 hour')
assert.equal(relativeDue(at(5.9), NOW), 'in 5 hours', 'rounded down, never overstated')
assert.equal(relativeDue(at(47), NOW), 'in 47 hours')
assert.equal(relativeDue(at(72), NOW), 'in 3 days')
assert.equal(relativeDue(at(0), NOW), 'now overdue')
assert.equal(relativeDue(at(-3), NOW), 'now overdue')
assert.equal(relativeDue(null, NOW), null)
assert.equal(relativeDue('nope', NOW), null)

const base = {
  to: 'ben@example.com',
  recipientName: 'Ben Okafor',
  teacherName: 'Sarah Kowalski',
  className: 'Year 13 Maths',
  assignmentId: '00000000-0000-4000-8000-00000000d0e1',
  title: 'Vectors drill',
  kind: 'question_set' as const,
  deadline: at(20),
  itemsLeft: 2,
  itemsTotal: 3,
  reason: 'due_soon' as const,
  unsubscribeHref: 'https://markscheme.app/community/unsubscribe?token=due',
  now: NOW,
}

// --- the cron's "due soon" -------------------------------------------------------------------

{
  const email = buildAssignmentDueEmail(base)
  assert.equal(email.subject, 'Due in 20 hours: Vectors drill')
  assert.match(email.text, /^Hi Ben,/)
  assert.match(email.text, /Vectors drill for Year 13 Maths is due in 20 hours\./)
  assert.match(email.text, /It is due Sat 26 Sep, 12:00 UTC, and 2 of 3 questions are still to hand in\./)
  assert.match(email.html, /questions left/)
  assert.match(email.html, /Finish the set →/)
  assert.match(email.html, /\/dashboard\/assignments\/00000000-0000-4000-8000-00000000d0e1/)
  assert.ok(email.html.includes(base.unsubscribeHref))
  assert.doesNotMatch(email.html + email.text, /Okafor|Kowalski/, 'names only through displayName')
}

// --- the teacher's Remind, before and after the deadline -------------------------------------

{
  const chased = buildAssignmentDueEmail({ ...base, reason: 'teacher', deadline: at(30) })
  assert.equal(chased.subject, 'Reminder from Sarah K.: Vectors drill')
  assert.match(chased.text, /Sarah K\. sent a reminder about Vectors drill for Year 13 Maths\./)

  const overdue = buildAssignmentDueEmail({ ...base, reason: 'teacher', deadline: at(-26), itemsLeft: 3 })
  assert.match(overdue.text, /It was due Thu 24 Sep, 14:00 UTC, and all 3 questions are still to hand in\./)
  assert.match(overdue.text, /Late work still counts/)
  assert.match(overdue.html, /Hand it in →/)

  const single = buildAssignmentDueEmail({ ...base, kind: 'whole_paper', itemsLeft: 1, itemsTotal: 1 })
  assert.match(single.text, /and it is still to hand in\./)
  assert.doesNotMatch(single.html, /papers left/, 'no stat row for a single item')

  const noDeadline = buildAssignmentDueEmail({ ...base, reason: 'teacher', deadline: null })
  assert.match(noDeadline.text, /There is no deadline, but 2 of 3 questions are still to hand in\./)
}

{
  const hostile = buildAssignmentDueEmail({ ...base, title: '<a href="https://evil">Claim</a>', className: '<i>x</i>' })
  assert.doesNotMatch(hostile.html, /<a href="https:\/\/evil">|<i>x<\/i>/)
  assert.doesNotMatch(hostile.subject, /[\r\n]/)
}

console.log('assignment-due.test.ts — all assertions passed')
