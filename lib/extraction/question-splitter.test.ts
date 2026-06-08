import assert from 'node:assert/strict'
import {
  buildSortablePath,
  collapseEmptyParentStubs,
  parentQuestionNumber,
  questionNestingDepth,
  splitQuestions,
} from './question-splitter'
import type { SplitQuestion } from './question-splitter'
import type { ParsedPaperMeta } from './paper-meta'

const structuredMeta: ParsedPaperMeta = {
  storagePrefix: 'cambridge',
  subjectCode: '9702',
  sessionCode: 's24',
  session: 'May/June',
  year: 2024,
  component: '42',
  paperNumber: '4',
  variant: '42',
  paperKind: 'structured',
  sourcePdfPath: 'cambridge/9702/s24/qp_42.pdf',
}

const mcqMeta: ParsedPaperMeta = {
  ...structuredMeta,
  component: '12',
  paperNumber: '1',
  variant: '12',
  paperKind: 'mcq',
}

assert.equal(questionNestingDepth('12'), 0)
assert.equal(questionNestingDepth('4(a)(i)'), 2)
assert.equal(parentQuestionNumber('1(c)(i)'), '1(c)')
assert.equal(parentQuestionNumber('2(a)'), '2')

const mcq = splitQuestions(
  [
    {
      question_number: '1',
      question_text: 'What is the unit of force?',
      options: { A: '$N$', B: '$J$', C: '$W$', D: '$Pa$' },
      source_page_numbers: [3],
    },
  ],
  mcqMeta
)
assert.ok(mcq.questions[0].question_text.includes('| Option | Text |'))
assert.equal(mcq.questions[0].is_leaf, true)

const deep = splitQuestions(
  [{ question_number: '1(a)(i)(x)', question_text: 'too deep', marks: 1 }],
  structuredMeta
)
assert.equal(deep.questions.length, 0)
assert.ok(deep.issues[0].includes('exceeds max'))

const tables = splitQuestions(
  [
    {
      question_number: '1(a)',
      question_text: 'Complete the table.',
      tables: [{ headers: ['A', 'B'], rows: [['1', '2']] }],
      marks: 2,
      is_leaf: true,
    },
  ],
  structuredMeta
)
assert.ok(tables.questions[0].question_text.includes('| A | B |'))
assert.equal(buildSortablePath('1(a)(i)'), '01.a.i')
assert.equal(buildSortablePath('12(b)(iii)'), '12.b.iii')
assert.equal(buildSortablePath('4'), '04')
assert.equal(buildSortablePath('1'), '01')
assert.equal(buildSortablePath('7(ii)'), '07.ii')

const stubParent: SplitQuestion = {
  question_number: '8(a)',
  question_path: '08.a',
  parent_question_number: '8',
  depth: 1,
  is_leaf: false,
  question_text: '',
  marks: null,
  source_page_numbers: [18],
  options: null,
  tables: null,
  figure_refs: [],
}
const stubChild: SplitQuestion = {
  question_number: '8(a)(i)',
  question_path: '08.a.i',
  parent_question_number: '8(a)',
  depth: 2,
  is_leaf: true,
  question_text: 'Explain the lines.',
  marks: 2,
  source_page_numbers: [18],
  options: null,
  tables: null,
  figure_refs: [],
}
const collapsed = collapseEmptyParentStubs([stubParent, stubChild])
assert.equal(collapsed.questions.length, 1)
assert.equal(collapsed.questions[0].question_number, '8(a)')

console.log('question-splitter.test.ts: ok')
