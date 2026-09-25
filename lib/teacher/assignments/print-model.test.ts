import assert from 'node:assert/strict'
import { buildAssignmentPrintModel, itemReference } from '@/lib/teacher/assignments/print-model'
import type { AssignmentItem } from '@/lib/teacher/types'

const SET = '00000000-0000-4000-8000-00000000a001'
const SCHEME = '00000000-0000-4000-8000-00000000e001'

function item(over: Partial<AssignmentItem>): AssignmentItem {
  return {
    id: `item-${over.position ?? 0}`,
    assignment_id: SET,
    position: 0,
    item_type: 'past_paper_question',
    mark_scheme_id: SCHEME,
    paper_code: '9709/12',
    paper_session: 'May/June 2024',
    question_number: '3',
    total_marks: 5,
    syllabus_tags: null,
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
    ...over,
  }
}

const items = [
  item({ position: 2, item_type: 'prompt', mark_scheme_id: null, paper_code: null, paper_session: null, question_number: null, prompt_text: '  Explain why x < 3.  ', total_marks: 4 }),
  item({ position: 0, topic_code: '1.2' }),
  item({ position: 1, item_type: 'whole_paper', mark_scheme_id: null, question_number: null, total_marks: 75 }),
]

const model = buildAssignmentPrintModel({
  assignment: {
    title: 'Mock week',
    subject_code: '9709',
    due_at: '2026-10-02T16:00:00.000Z',
    instructions: '  Calculators allowed.  ',
    is_mock: true,
    settings: { timed_minutes: 90 },
  },
  classroom: { name: '12B Maths', invite_code: 'abc234' },
  items,
  questionTexts: new Map([[SCHEME, 'Find the roots of x^2 - 5x + 6 = 0.']]),
})

assert.deepEqual(model.items.map((i) => i.number), [1, 2, 3], 'numbered in position order')
assert.deepEqual(model.items.map((i) => i.kind), ['past_paper_question', 'whole_paper', 'prompt'])
assert.equal(model.items[0].text, 'Find the roots of x^2 - 5x + 6 = 0.', 'the question text from the bank')
assert.equal(model.items[0].reference, '9709/12 · May/June 2024 · Q3', 'the scheme citation')
assert.equal(model.items[0].topic_code, '1.2')
assert.equal(model.items[1].text, 'Answer every question on 9709/12 (May/June 2024).')
assert.equal(model.items[1].reference, '9709/12 · May/June 2024')
assert.equal(model.items[2].text, 'Explain why x < 3.', 'the prompt, trimmed and intact')
assert.equal(model.items[2].reference, null, 'a prompt cites no paper')
assert.equal(model.total_marks, 84)
assert.equal(model.instructions, 'Calculators allowed.')
assert.equal(model.timed_minutes, 90)
assert.equal(model.is_mock, true)
assert.equal(model.join_code, 'ABC-234', 'the join code as it is read out')
assert.equal(model.join_path, '/join/ABC234')
assert.equal(model.class_name, '12B Maths')
assert.ok(!JSON.stringify(model).includes('mark_scheme"'), 'no scheme field anywhere in the model')

{
  const unknownTotal = buildAssignmentPrintModel({
    assignment: { title: 'x', subject_code: '9709', due_at: null, instructions: null, is_mock: false, settings: {} },
    classroom: { name: 'c', invite_code: null },
    items: [item({ total_marks: null }), item({ position: 1 })],
    questionTexts: new Map(),
  })
  assert.equal(unknownTotal.total_marks, null, 'no total when any item’s is unknown — never a misleading sum')
  assert.equal(unknownTotal.items[0].text, null, 'no text in the bank: the sheet shows the citation only')
  assert.equal(unknownTotal.join_code, null)
  assert.equal(unknownTotal.join_path, null)
  assert.equal(unknownTotal.timed_minutes, null)
}

{
  const hostile = buildAssignmentPrintModel({
    assignment: { title: 'x', subject_code: '9709', due_at: null, instructions: null, is_mock: false, settings: {} },
    classroom: { name: 'c', invite_code: '../admin' },
    items: [],
    questionTexts: new Map(),
  })
  assert.equal(hostile.join_path, null, 'a code that is not a valid invite code never becomes a link')
  assert.equal(hostile.total_marks, null, 'an empty set has no total')
}

assert.equal(itemReference(item({ paper_code: null, paper_session: null, question_number: null })), null)

console.log('print-model.test.ts: all checks passed')
