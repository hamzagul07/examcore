import assert from 'node:assert/strict'
import {
  buildMarkReadyEmail,
  buildMarkFailedEmail,
} from '@/lib/email/mark-ready'

/**
 * The mark-ready email.
 *
 * This is mail sent to somebody who is not looking at the app, so the failure
 * modes are silent ones: a wrong number in a subject line, or marking scheme
 * text leaking into an inbox we cannot withdraw it from.
 */
const base = {
  to: 'student@example.com',
  attemptId: '00000000-0000-4000-8000-000000000001',
  unsubscribeHref: 'https://markscheme.app/community/unsubscribe?token=abc',
}

function main() {
  // --- the score is the payload ----------------------------------------------
  const plain = buildMarkReadyEmail({
    ...base,
    recipientName: 'Amara',
    marksEarned: 5,
    totalMarks: 8,
    subjectLabel: 'Economics',
    paperRef: '9708/22',
  })
  assert.match(plain.subject, /5\/8/, 'the score belongs in the subject line')
  assert.match(plain.subject, /9708\/22/)
  assert.match(plain.text, /Hi Amara,/)
  assert.match(plain.html, /Economics 9708\/22/)
  assert.match(plain.text, /63%/, 'percentage is rounded from 5/8')
  assert.match(
    plain.html,
    new RegExp(`/dashboard/attempt/${base.attemptId}`),
    'the CTA must reach the durable result page'
  )

  // --- no marking detail in the mail -----------------------------------------
  // Published scheme text is served behind the app deliberately; copying it into
  // email would put it somewhere it can never be pulled back from.
  //
  // Award codes are matched on word boundaries: an unanchored /A1/i also hits
  // the template's own `#1a1a1a`, which is how a green assertion here would
  // have meant nothing at all.
  assert.doesNotMatch(plain.html, /\bmark scheme\b/i)
  assert.doesNotMatch(plain.html, /\b[BMA]1\b/)

  // --- the gap, in both directions -------------------------------------------
  const over = buildMarkReadyEmail({
    ...base,
    marksEarned: 4,
    totalMarks: 10,
    predictedMarks: 8,
  })
  assert.match(
    over.html,
    /Marking yourself 4 marks high/,
    'over-prediction is named as the habit that costs grades'
  )

  const under = buildMarkReadyEmail({
    ...base,
    marksEarned: 9,
    totalMarks: 10,
    predictedMarks: 6,
  })
  assert.match(under.html, /underrating your own work by 3 marks/)

  const exact = buildMarkReadyEmail({
    ...base,
    marksEarned: 7,
    totalMarks: 10,
    predictedMarks: 7,
  })
  assert.match(exact.html, /exactly right/)

  // Singular/plural: "1 marks high" is the kind of thing that reads as a bug.
  const one = buildMarkReadyEmail({
    ...base,
    marksEarned: 5,
    totalMarks: 10,
    predictedMarks: 6,
  })
  assert.match(one.html, /1 mark high/)
  assert.doesNotMatch(one.html, /1 marks/)

  // No prediction: the paragraph must be absent, not empty or "null".
  assert.doesNotMatch(plain.html, /predicted/i)
  assert.doesNotMatch(plain.text, /null|undefined|NaN/)

  // --- names are escaped ------------------------------------------------------
  // full_name is user-controlled and lands in an HTML email body.
  const injected = buildMarkReadyEmail({
    ...base,
    recipientName: '<script>alert(1)</script>',
    marksEarned: 1,
    totalMarks: 2,
  })
  assert.doesNotMatch(injected.html, /<script>/)
  assert.match(injected.html, /&lt;script&gt;/)

  // --- unknown subject degrades, never prints a bare code ---------------------
  const anonymous = buildMarkReadyEmail({ ...base, marksEarned: 3, totalMarks: 4 })
  assert.match(anonymous.html, /your answer/, 'falls back to a neutral phrase')
  assert.doesNotMatch(anonymous.subject, /\(\)/, 'no empty parens in the subject')

  // --- the failure twin -------------------------------------------------------
  const failed = buildMarkFailedEmail({
    to: base.to,
    recipientName: 'Sam',
    subjectLabel: 'Economics',
    paperRef: '9708/22',
    unsubscribeHref: base.unsubscribeHref,
  })
  assert.match(failed.subject, /did not finish/)
  assert.match(
    failed.html,
    /nothing was charged|Nothing was charged/,
    'the reservation is released on failure, so say so'
  )
  assert.doesNotMatch(failed.html, /\/dashboard\/attempt\//, 'there is no attempt to link to')

  console.log('mark-ready.test.ts: ok')
}

main()
