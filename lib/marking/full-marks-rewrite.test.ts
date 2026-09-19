import assert from 'node:assert/strict'
import { parseFullMarksRewrite } from './full-marks-rewrite'

const complete = JSON.stringify({
  rewritten_answer: '  One way is the source of funding. Funders may only back research that supports their agenda.  ',
  annotations: [
    { text: 'Explained HOW the funder influences the research', earns: 'A1' },
    { text: '', earns: 'A2' },
    { text: 'no earns', earns: '   ' },
    null,
  ],
})

const parsed = parseFullMarksRewrite(complete, 'STOP')
assert.ok(parsed)
assert.equal(
  parsed.rewritten_answer,
  'One way is the source of funding. Funders may only back research that supports their agenda.'
)
assert.deepEqual(parsed.annotations, [
  { text: 'Explained HOW the funder influences the research', earns: 'A1' },
])

assert.ok(
  parseFullMarksRewrite('```json\n' + complete + '\n```'),
  'a fenced reply still parses'
)

// The production failure: thinking ate the budget, the JSON string was cut
// mid-sentence, jsonrepair closed it, and a half answer was stored as complete.
const truncated = '{"rewritten_answer": "One way research can be influenced is by the source of its funding. This can lead to pressure on the researcher to formulate their'
assert.equal(
  parseFullMarksRewrite(truncated, 'MAX_TOKENS'),
  null,
  'a MAX_TOKENS finish is never a rewrite, even when the JSON can be repaired'
)
assert.equal(
  parseFullMarksRewrite(complete, 'MAX_TOKENS'),
  null,
  'the finish reason wins over a parseable body'
)

assert.equal(parseFullMarksRewrite('', 'STOP'), null)
assert.equal(
  parseFullMarksRewrite(JSON.stringify({ annotations: [] }), 'STOP'),
  null,
  'no answer text is no rewrite'
)
assert.equal(
  parseFullMarksRewrite(JSON.stringify({ rewritten_answer: 'ok' }), undefined)?.annotations.length,
  0,
  'missing annotations default to an empty list'
)

console.log('full-marks-rewrite: all assertions passed')
