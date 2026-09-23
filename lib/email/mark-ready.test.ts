import assert from 'node:assert/strict'
import {
  buildMarkReadyEmail,
  buildMarkFailedEmail,
  studyNoteForEmail,
  weakTopicsForEmail,
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
  assert.match(plain.html, /Marking for Economics 9708\/22 is finished/)
  // Sent to every student now, not only the ones who left — the copy must
  // not tell someone who watched the whole thing that they closed the tab.
  assert.doesNotMatch(plain.html, /closed the tab|without you/i)
  assert.doesNotMatch(plain.text, /closed the tab|without you/i)
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
  assert.match(anonymous.html, /Marking for your answer is finished/, 'falls back to a neutral phrase')
  assert.doesNotMatch(anonymous.subject, /\(\)/, 'no empty parens in the subject')

  // --- where the marks went + what to do next --------------------------------
  const guided = buildMarkReadyEmail({
    ...base,
    marksEarned: 5,
    totalMarks: 8,
    weakTopics: ['Analysis (AO3)', 'Contextual evaluation (AO4)', 'Analysis (AO3)', 'Knowledge', 'Extra'],
    shareableTakeaway:
      "Practice writing paragraphs where you explain the chain of consequences. For each point, ask 'so what?' at least twice.",
  })
  assert.match(guided.html, /Where the marks went/)
  assert.match(guided.html, /Analysis \(AO3\)/)
  assert.doesNotMatch(guided.html, /Extra/, 'capped at three tags')
  assert.equal((guided.html.match(/Analysis \(AO3\)/g) || []).length, 1, 'duplicates collapse')
  assert.match(guided.html, /What to do next/)
  assert.match(guided.html, /ask &#39;so what\?&#39; at least twice|ask 'so what\?' at least twice/)
  assert.match(guided.text, /Where the marks went: Analysis \(AO3\), Contextual evaluation \(AO4\), Knowledge/)
  assert.match(guided.text, /What to do next: Practice writing/)

  // The next mark is one tap away, with the subject already chosen.
  const entry = buildMarkReadyEmail({
    ...base,
    marksEarned: 5,
    totalMarks: 8,
    subjectLabel: 'Economics',
    nextMarkHref: 'https://markscheme.app/mark?subject=9708',
  })
  assert.match(entry.html, /Mark another Economics question/)
  assert.match(entry.html, /\/mark\?subject=9708/)
  assert.match(entry.text, /Mark another question: https:\/\/markscheme\.app\/mark\?subject=9708/)
  assert.doesNotMatch(plain.html, /Mark another/, 'no link when no href was given')

  // Absent when there is nothing to say — no empty heading, no 'null'.
  assert.doesNotMatch(plain.html, /Where the marks went|What to do next/)
  // Only the takeaway written to leave the app is accepted; the in-app study
  // note has no way in, however safe it looks.
  const inApp = buildMarkReadyEmail({
    ...base,
    marksEarned: 5,
    totalMarks: 8,
    ...({ whatToStudyNext: 'Practice explaining chains of consequence.' } as object),
  })
  assert.doesNotMatch(inApp.html, /What to do next/)

  // The guard: anything that names the scheme or reads like an award code
  // stays behind the app. Better a shorter email than scheme text in an inbox.
  assert.equal(studyNoteForEmail('Revisit the mark scheme for Q3 and learn the M1 step.'), null)
  assert.equal(studyNoteForEmail('You lost the A1 for rounding.'), null)
  // Scheme-speak without an award code — the dialect itself is the tell.
  assert.equal(studyNoteForEmail('Award one mark for identifying the shift in demand.'), null)
  assert.equal(studyNoteForEmail('Accept any correct method. Condone missing units.'), null)
  assert.equal(studyNoteForEmail('Two marks for the correct substitution, cao.'), null)
  assert.equal(studyNoteForEmail('Give the M 1 for rearranging first.'), null)
  assert.equal(studyNoteForEmail('Max 3 if no working shown.'), null)
  assert.equal(
    studyNoteForEmail('Practice explaining the chain of consequences before you evaluate.'),
    'Practice explaining the chain of consequences before you evaluate.'
  )
  assert.equal(studyNoteForEmail('   '), null)
  assert.equal(
    studyNoteForEmail('Your explanations clearly state *why* a factor **matters**.'),
    'Your explanations clearly state why a factor matters.',
    'stray Markdown emphasis is stripped, not shown literally'
  )
  assert.equal(studyNoteForEmail('Show every step of working.'), 'Show every step of working.')
  const long = studyNoteForEmail(
    'First sentence about method. ' + 'Second sentence that is quite long and keeps going on about the working. '.repeat(6)
  )
  assert.ok(long && long.length <= 321, `cut to one inbox paragraph, got ${long?.length}`)
  assert.match(long!, /[.…]$/, 'ends at a sentence or with an ellipsis')
  assert.deepEqual(weakTopicsForEmail(['Vectors', 'Use the mark scheme', 'x'.repeat(60), 'Vectors ']), ['Vectors'])
  // A marking point dressed as a tag is still a marking point.
  assert.deepEqual(
    weakTopicsForEmail(['State that demand shifts right', 'Analysis (AO3)', 'Accept a labelled diagram']),
    ['Analysis (AO3)']
  )
  assert.deepEqual(weakTopicsForEmail(null), [])

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
