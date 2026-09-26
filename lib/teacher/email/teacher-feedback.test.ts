import assert from 'node:assert/strict'
import { attemptUrl, buildTeacherFeedbackEmail, markChangeText } from '@/lib/email/teacher-feedback'

// --- the numbers -------------------------------------------------------------------------

assert.equal(markChangeText(6, 7, 9), '6 → 7/9')
assert.equal(markChangeText(7, 7, 9), '7/9', 'no arrow when nothing changed')
assert.equal(markChangeText(null, 7, 9), '7/9', 'an unknown "before" is left out, never guessed')
assert.equal(markChangeText(6, 7, null), '6 → 7')
assert.equal(markChangeText(6.5, 7, 9), '6.5 → 7/9', 'half marks survive')
assert.equal(markChangeText(0.1 + 0.2, 1, 2), '0.3 → 1/2', 'float noise is not printed')
assert.equal(markChangeText(6, null, 9), null)

const base = {
  to: 'amira@example.com',
  recipientName: 'Amira Khan',
  teacherName: 'Sarah Kowalski',
  attemptId: '00000000-0000-4000-8000-0000000fb001',
  workLabel: '9709/12 Q3',
  marksBefore: 6,
  marksAfter: 7,
  totalMarks: 9,
  note: 'You earned the method mark for the substitution.',
  unsubscribeHref: 'https://markscheme.app/community/unsubscribe?token=fb',
}

{
  const email = buildTeacherFeedbackEmail({ ...base, kind: 'overridden' })
  assert.equal(email.subject, 'Sarah K. re-marked 9709/12 Q3: 6 → 7/9')
  assert.match(email.text, /Sarah K\. has re-marked 9709\/12 Q3\. Your mark is now 7\/9\./)
  assert.match(email.text, /Marked before: 6\. Marked now: 7 of 9\./)
  assert.match(email.html, /marked before/)
  assert.match(email.text, /You earned the method mark/)
  assert.ok(email.html.includes(attemptUrl(base.attemptId)), 'CTA opens the marked answer')
  assert.ok(email.html.includes(base.unsubscribeHref))
  assert.doesNotMatch(email.html + email.text, /Kowalski|Khan/)
}

{
  const email = buildTeacherFeedbackEmail({ ...base, kind: 'confirmed', marksBefore: null, note: null })
  assert.equal(email.subject, 'Sarah K. checked your mark on 9709/12 Q3: 7/9')
  assert.match(email.text, /your 7\/9 stands\./)
  assert.doesNotMatch(email.html, /marked before/, 'no before/after row for a confirm')
  assert.doesNotMatch(email.text, /wrote:/, 'no empty note block')
}

{
  const email = buildTeacherFeedbackEmail({
    ...base,
    kind: 'feedback',
    workLabel: null,
    marksBefore: null,
    marksAfter: null,
    totalMarks: null,
    note: 'Great start.\n\n<script>alert(1)</script> Check part (b).',
  })
  assert.equal(email.subject, 'Sarah K. left you feedback on your answer')
  assert.doesNotMatch(email.html, /<script>/, 'the note is escaped')
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
  assert.match(email.preheader, /^Great start\./)
}

{
  const long = buildTeacherFeedbackEmail({ ...base, kind: 'feedback', note: 'Detail. '.repeat(300) })
  assert.match(long.html, /The full note is with your marked answer/, 'a long note is an excerpt with a pointer')
  assert.ok(long.text.length < 2000)
}

console.log('teacher-feedback.test.ts — all assertions passed')
