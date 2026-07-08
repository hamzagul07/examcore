import assert from 'node:assert/strict'
import { parseDetectedQuestions } from './split-questions'

// --- Two distinct questions parsed with their totals ---
{
  const out = parseDetectedQuestions({
    questions: [
      { question_number: '1', question_text: 'Find E[X]. (a)... (b)...', total_marks: 8 },
      { question_number: '2', question_text: 'Find h. (a)... (b)...', total_marks: 16 },
    ],
  })
  assert.equal(out.length, 2, 'two questions')
  assert.equal(out[0].total_marks, 8)
  assert.equal(out[1].question_number, '2')
  assert.equal(out[1].total_marks, 16)
}

// --- One question (sub-parts already merged) → single item ---
{
  const out = parseDetectedQuestions({
    questions: [{ question_text: 'Q5 (a) ... (b) ... (c) ...', total_marks: 8 }],
  })
  assert.equal(out.length, 1, 'single question stays single')
  assert.equal(out[0].question_number, '1', 'number backfilled')
}

// --- Empty stems dropped; missing number backfilled; bad total → null ---
{
  const out = parseDetectedQuestions({
    questions: [
      { question_text: '', total_marks: 4 }, // dropped (no stem)
      { question_text: 'Real question', total_marks: 'oops' },
    ],
  })
  assert.equal(out.length, 1, 'empty stem dropped')
  assert.equal(out[0].question_number, '2', 'number backfilled from index')
  assert.equal(out[0].total_marks, null, 'non-numeric total → null')
}

// --- Malformed input → empty (caller falls back to single-question path) ---
assert.deepEqual(parseDetectedQuestions(null), [], 'null → []')
assert.deepEqual(parseDetectedQuestions({}), [], 'no questions key → []')
assert.deepEqual(parseDetectedQuestions({ questions: 'x' }), [], 'non-array → []')

console.log('split-questions: all assertions passed')
