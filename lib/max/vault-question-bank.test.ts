import assert from 'node:assert/strict'
import {
  buildVaultQuestionBank,
  topicalAttemptHref,
  topicalCatalogCode,
} from '@/lib/max/vault-question-bank'

assert.equal(topicalCatalogCode('9709'), '9709')
assert.equal(topicalCatalogCode('WMA11'), '9709')
assert.equal(topicalCatalogCode('ib-maths-aa-hl'), '9709')

const sample = {
  stem: 'Solve the quadratic…',
  marks: 7,
  sessionLabel: 'October/November 2024',
  paperCode: '9709/12',
  questionNumber: '9(a)',
  markHref: '/mark?subject=9709&paper=9709%2F12&session=w24&question=9(a)',
}
const href = topicalAttemptHref(sample, { pattern: 'Quadratics' })
assert.ok(href.startsWith('/mark?'))
assert.ok(href.includes('practice=1'))
assert.ok(href.includes('return=vault'))
assert.ok(href.includes('session=w24'))
assert.ok(href.includes('q=9'))

const bank = buildVaultQuestionBank({
  subjectCode: '9709',
  subjectLabel: 'Mathematics',
  weakTopics: [{ code: '1.1', name: 'Quadratics', reason: 'Weak on this.' }],
  drills: [
    {
      paperCode: '9709/12',
      paperSession: 'w24',
      questionNumber: '1',
      totalMarks: 4,
      reason: 'Close the gap.',
      targetLabel: 'Quadratics',
      topicCode: '1.1',
    },
  ],
  limit: 6,
})
assert.ok(bank)
assert.equal(bank!.subjectCode, '9709')
assert.ok(bank!.questions.length >= 1)
assert.ok(bank!.questions[0]!.attemptHref.includes('practice=1'))
assert.ok(bank!.questions.some((q) => q.source === 'weakness'))

const emptyFocus = buildVaultQuestionBank({
  subjectCode: null,
  subjectLabel: null,
  weakTopics: [],
  drills: [],
})
assert.equal(emptyFocus, null)

console.log('vault-question-bank.test.ts: ok')
