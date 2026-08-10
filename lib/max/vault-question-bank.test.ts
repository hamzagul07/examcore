import assert from 'node:assert/strict'
import {
  buildVaultQuestionBank,
  buildVaultQuestionBanks,
  topicalAttemptHref,
  topicalCatalogCode,
} from '@/lib/max/vault-question-bank'

assert.equal(topicalCatalogCode('9709'), '9709')
assert.equal(topicalCatalogCode('WMA11'), null, 'Edexcel must not use CAIE topical cache')
assert.equal(topicalCatalogCode('ib-maths-aa-hl'), null, 'IB must not use CAIE topical cache')
assert.equal(topicalCatalogCode('aqa-mathematics'), null)

const sample = {
  stem: 'Solve the quadratic…',
  marks: 7,
  sessionLabel: 'October/November 2024',
  paperCode: '9709/12',
  questionNumber: '9(a)',
  markHref: '/mark?subject=9709&paper=9709%2F12&session=w24&question=9(a)',
}
const href = topicalAttemptHref(sample, { pattern: 'Quadratics' })
assert.ok(href.includes('practice=1'))
assert.ok(href.includes('return=vault'))
assert.ok(href.includes('q=9'))
assert.ok(href.includes('October'), 'uses full session label for answer-only mark')

const caie = buildVaultQuestionBank({
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
assert.ok(caie)
assert.equal(caie!.board, 'cambridge')
assert.ok(caie!.eyebrow.includes('9709'))
assert.ok(!/cambridge question bank/i.test(caie!.title))
assert.ok(caie!.questions.some((q) => q.source === 'weakness'))

const edexcel = buildVaultQuestionBank({
  subjectCode: 'WMA11',
  subjectLabel: 'Pure Mathematics 1',
  weakTopics: [{ code: '1.1', name: 'Algebra', reason: 'Needs work.' }],
  drills: [
    // Poison pill — Cambridge paper must never appear on Edexcel shelf.
    {
      paperCode: '9709/12',
      paperSession: 'w24',
      questionNumber: '1',
      totalMarks: 4,
      reason: 'Should be filtered.',
      targetLabel: 'Quadratics',
      topicCode: '1.1',
    },
  ],
  limit: 4,
})
assert.ok(edexcel)
assert.equal(edexcel!.board, 'edexcel')
assert.ok(edexcel!.eyebrow.toLowerCase().includes('edexcel'))
assert.ok(
  !edexcel!.questions.some((q) => q.paperCode.startsWith('9709')),
  'Edexcel desk must not list CAIE papers'
)
assert.ok(edexcel!.note.toLowerCase().includes('edexcel'))

const ib = buildVaultQuestionBank({
  subjectCode: 'ib-maths-aa-hl',
  subjectLabel: 'Maths AA HL',
  weakTopics: [{ code: '1.1', name: 'Number', reason: 'Gap.' }],
  drills: [],
  limit: 4,
})
assert.ok(ib)
assert.equal(ib!.board, 'ib')
assert.ok(ib!.eyebrow.startsWith('IB'))
assert.ok(!ib!.questions.some((q) => String(q.paperCode).startsWith('9709')))

const many = buildVaultQuestionBanks(
  [
    {
      code: '9709',
      name: 'Mathematics',
      weakTopics: [],
      drills: [
        {
          paperCode: '9709/12',
          paperSession: 'w24',
          questionNumber: '2',
          totalMarks: 3,
          reason: 'Practice',
          targetLabel: 'Functions',
        },
      ],
    },
    {
      code: 'WMA11',
      name: 'Pure Mathematics 1',
      weakTopics: [],
      drills: [],
    },
  ],
  { focusCode: 'WMA11' }
)
assert.equal(many.length, 2)
assert.equal(many[0]!.subjectCode, 'WMA11', 'focus subject sorts first')
assert.equal(many[0]!.board, 'edexcel')
assert.equal(many[1]!.board, 'cambridge')

assert.equal(
  buildVaultQuestionBank({
    subjectCode: null,
    subjectLabel: null,
    weakTopics: [],
    drills: [],
  }),
  null
)

console.log('vault-question-bank.test.ts: ok')
