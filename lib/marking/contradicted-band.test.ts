import assert from 'node:assert/strict'
import {
  BOTTOM_AWARD_FRACTION,
  SUBSTANTIAL_ANSWER_CHARS,
  bandJustificationText,
  findBandContradiction,
} from '@/lib/marking/contradicted-band'

// The band_result that actually shipped to a student on 2026-09-14, verbatim
// from attempts.ai_marking. The answer sent with it was 2,043 characters.
const REAL_INCIDENT_JUSTIFICATION =
  'The response correctly adopts the diary entry format and introduces the main ' +
  'topic. However, the text is a fragment, stopping mid-sentence after only two ' +
  'lines. It does not address the key requirements of the question: reflecting on ' +
  'specific changes, motivations, and expected results. Because the response is so ' +
  "severely incomplete, it can only be described as a 'Limited response' (Level 1). " +
  'Within this level, it earns 1 mark as it represents a minimal, fragmentary start ' +
  'to the task rather than a complete, albeit brief, response.'

const real = findBandContradiction({
  justification: REAL_INCIDENT_JUSTIFICATION,
  answerChars: 2043,
  marksAwarded: 1,
  marksAvailable: 12,
})
assert.equal(real.contradicted, true, 'the 1/12 French mark must be caught')
assert.ok(real.claim, 'the matched phrase is quoted back in the log')

// --- it must not fire on ordinary harsh marking --------------------------------

// A genuinely brief answer described accurately: nothing to catch.
assert.equal(
  findBandContradiction({
    justification: 'The response is a fragment, stopping mid-sentence.',
    answerChars: 80,
    marksAwarded: 1,
    marksAvailable: 12,
  }).contradicted,
  false,
  'a short answer really can be a fragment'
)

// Quality judgments on a long answer are what an examiner is for. If these trip
// the guard it will be switched off, and then it protects nobody.
for (const commentary of [
  'The argument is underdeveloped and lacks supporting detail throughout.',
  'Knowledge is present but the response does not evaluate.',
  'Expression is often unclear and errors impede communication.',
  'The candidate has misunderstood the question entirely.',
]) {
  assert.equal(
    findBandContradiction({
      justification: commentary,
      answerChars: 2043,
      marksAwarded: 1,
      marksAvailable: 12,
    }).contradicted,
    false,
    `must not fire on quality commentary: "${commentary.slice(0, 40)}…"`
  )
}

// An absence claim beside marks that were actually awarded is commentary, not a
// misread — the student was clearly read.
assert.equal(
  findBandContradiction({
    justification: 'The final paragraph cuts off mid-sentence.',
    answerChars: 2043,
    marksAwarded: 8,
    marksAvailable: 12,
  }).contradicted,
  false,
  'a mid-band award means the work was read'
)

// --- boundaries are the thing most likely to drift -----------------------------

assert.equal(
  findBandContradiction({
    justification: 'The answer is a fragment.',
    answerChars: SUBSTANTIAL_ANSWER_CHARS - 1,
    marksAwarded: 0,
    marksAvailable: 12,
  }).contradicted,
  false,
  'just under the substantial floor does not fire'
)
assert.equal(
  findBandContradiction({
    justification: 'The answer is a fragment.',
    answerChars: SUBSTANTIAL_ANSWER_CHARS,
    marksAwarded: 0,
    marksAvailable: 12,
  }).contradicted,
  true,
  'at the floor it does'
)
assert.equal(
  findBandContradiction({
    justification: 'The answer is a fragment.',
    answerChars: 2043,
    marksAwarded: Math.ceil(12 * BOTTOM_AWARD_FRACTION) + 1,
    marksAvailable: 12,
  }).contradicted,
  false,
  'above the bottom fraction it is commentary'
)

// An unknown denominator cannot place the award, so it must not guess.
assert.equal(
  findBandContradiction({
    justification: 'The answer is a fragment.',
    answerChars: 2043,
    marksAwarded: 1,
    marksAvailable: 0,
  }).contradicted,
  false,
  'no denominator, no verdict'
)

// --- the claim can hide in any of the band fields ------------------------------

const fromImprovements = bandJustificationText(
  {
    justification: 'Level 1.',
    band_descriptor: 'Limited response.',
    improvements: ['The most critical issue is that the response is a fragment.'],
  },
  'You have made a good start.'
)
assert.ok(fromImprovements.includes('fragment'), 'improvements[] is searched too')
assert.ok(fromImprovements.includes('good start'), 'summary is searched too')
assert.equal(
  findBandContradiction({
    justification: fromImprovements,
    answerChars: 2043,
    marksAwarded: 1,
    marksAvailable: 12,
  }).contradicted,
  true,
  'a claim in improvements[] still counts'
)

// Shapes that must not throw.
assert.equal(bandJustificationText(null, null), '')
assert.equal(bandJustificationText(undefined), '')
assert.equal(
  findBandContradiction({
    justification: '',
    answerChars: 2043,
    marksAwarded: 1,
    marksAvailable: 12,
  }).contradicted,
  false
)

console.log('contradicted-band.test.ts: ok')
