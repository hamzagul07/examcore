import assert from 'node:assert/strict'
import {
  ANSWER_KEEP_RATIO,
  ANSWER_RATIO_MIN_CHARS,
  chooseAnswerText,
  parsePracticeQuestionExtract,
  stripLeadingQuestion,
} from '@/lib/marking/practice-question-extract'

const QUESTION =
  "Evaluate the view that traditional gender identity is the most significant influence on an individual's identity."

// The transcript as OCR produced it on 2026-09-24: the question copied out on
// two lines, then two pages of essay.
const ESSAY_BODY =
  'For - Traditional gender roles are the biggest influence on an\nindividual identity.\n' +
  'Feminism argues that patriarchy - a social order where power is strictly held by men, is the main reason for inequality. ' +
  'Canalisation is where children\'s time is channelled into gender-specific activities (Ann Oakley 1974). '.repeat(24) +
  '\n\n[Page 2]\nAgainst - Perspectives such as Marxism argue that the most influential factor is social class. ' +
  'A triple shift is where women also act as a reserve army of labour. '.repeat(20) +
  '\nConclusion - the view differs by perspective.'
const OCR =
  '[Page 1]\nEvaluate the view that traditional gender identity is the most\nsignificant influence on an individual\'s identity.\n' +
  ESSAY_BODY

assert.ok(OCR.length > 4000, `fixture is essay-sized: ${OCR.length}`)

// --- what the model actually returned: 275 characters, cut mid-word ---------------

const TRUNCATED_RAW =
  '{\n  "question_found": true,\n  "question_text": "' +
  QUESTION +
  '",\n  "answer_text": "[Page 1]\\nFor - Traditional gender roles are the biggest influence on an\\nindividual identity'

{
  const parsed = parsePracticeQuestionExtract(TRUNCATED_RAW)
  assert.ok(parsed, 'jsonrepair seals the cut-off string into an object')
  assert.equal(parsed.question_text, QUESTION)
  assert.ok(parsed.answer_text.length < 120, `the fragment: ${parsed.answer_text.length} chars`)

  // Without the finish reason (the old code path) the ratio alone catches it.
  const chosen = chooseAnswerText(OCR, parsed)
  assert.equal(chosen.source, 'transcript')
  assert.equal(chosen.reason, 'fragment')
  assert.ok(chosen.text.startsWith('[Page 1]\nFor - Traditional'), 'question lines stripped, essay kept')
  assert.ok(chosen.text.length > OCR.length - QUESTION.length - 20, `whole essay: ${chosen.text.length} of ${OCR.length}`)
  assert.ok(!chosen.text.includes('Evaluate the view'), 'the copied question is gone')

  // With the finish reason, it is refused before any ratio.
  const flagged = chooseAnswerText(OCR, { ...parsed, truncated: true })
  assert.equal(flagged.reason, 'truncated')
  assert.ok(flagged.text.length > 4000)
}

// --- a faithful extraction is used as is ---------------------------------------------

{
  const full = { question_found: true, question_text: QUESTION, answer_text: ESSAY_BODY }
  const chosen = chooseAnswerText(OCR, full)
  assert.equal(chosen.source, 'extracted')
  assert.equal(chosen.text, ESSAY_BODY.trim())
}

// --- short transcripts are not judged by ratio ------------------------------------------

{
  const shortOcr = 'State Newton\'s second law. [2]\nF = ma, force equals mass times acceleration.'
  const extract = { question_found: true, question_text: "State Newton's second law.", answer_text: 'F = ma' }
  assert.ok(shortOcr.length < ANSWER_RATIO_MIN_CHARS)
  assert.equal(chooseAnswerText(shortOcr, extract).source, 'extracted', 'a one-line answer to a one-line question is fine')
}

// --- an empty extraction falls back to the transcript ---------------------------------------

{
  const chosen = chooseAnswerText(OCR, { question_found: false, question_text: '', answer_text: '' })
  assert.equal(chosen.reason, 'empty')
  assert.equal(chosen.text, OCR, 'no question known, nothing stripped')
}

// --- the ratio boundary ---------------------------------------------------------------------------

{
  const expected = OCR.trim().length - QUESTION.length
  const justEnough = 'x'.repeat(Math.ceil(expected * ANSWER_KEEP_RATIO) + 1)
  const notEnough = 'x'.repeat(Math.floor(expected * ANSWER_KEEP_RATIO) - 1)
  assert.equal(chooseAnswerText(OCR, { question_found: true, question_text: QUESTION, answer_text: justEnough }).source, 'extracted')
  assert.equal(chooseAnswerText(OCR, { question_found: true, question_text: QUESTION, answer_text: notEnough }).source, 'transcript')
}

// --- stripLeadingQuestion --------------------------------------------------------------------------

{
  const stripped = stripLeadingQuestion(OCR, QUESTION)
  assert.ok(stripped.startsWith('[Page 1]\nFor - Traditional'), `two question lines removed: ${JSON.stringify(stripped.slice(0, 40))}`)
  assert.equal(stripLeadingQuestion(OCR, 'A paraphrase the student never wrote down here at all'), OCR, 'no match, untouched')
  assert.equal(stripLeadingQuestion(OCR, 'short'), OCR, 'too short to match safely')
  // Punctuation and case differences in the OCR do not matter.
  const messy = 'EVALUATE the view, that traditional gender identity is the most significant influence on an individuals identity\nFor - ...'
  assert.ok(stripLeadingQuestion(messy, QUESTION).startsWith('For - ...'))
  // A question buried mid-transcript is not touched: only the head is searched.
  const late = 'For - some working.\n'.repeat(15) + QUESTION + '\nmore working'
  assert.equal(stripLeadingQuestion(late, QUESTION), late)
}

console.log('practice-question-extract.test.ts: ok')
