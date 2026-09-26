import assert from 'node:assert/strict'
import { parseAssignmentDraft, parseAssignmentPatch } from '@/lib/teacher/assignments/validate'
import type { AssignmentItem } from '@/lib/teacher/types'
import {
  buildDraftBody,
  buildPatchBody,
  draftToComposerState,
  clampPerTopic,
  composerIssue,
  composerItems,
  composerStep,
  filterTopicTree,
  itemIndex,
  paperChoices,
  parseComposerPrefill,
  parsePromptMarks,
  parseTimedMinutes,
  questionCount,
  suggestTitle,
  topicIndex,
  topicLabel,
  topicTree,
  type ComposerState,
} from '@/components/teacher/assignments/composer-model'

// --- topics -------------------------------------------------------------------

const TREE = topicTree([
  {
    parent: { code: '5', name: 'Integration' },
    leaves: [
      { code: '5.1', name: 'Integration as reverse differentiation' },
      { code: '5.4', name: 'Definite integrals' },
    ],
  },
  // 9709-style: the section is its own only leaf.
  { parent: { code: '1.2', name: 'Functions' }, leaves: [{ code: '1.2', name: 'Functions' }] },
])
assert.deepEqual(TREE, [
  {
    code: '5',
    name: 'Integration',
    leaves: [
      { code: '5.1', name: 'Integration as reverse differentiation' },
      { code: '5.4', name: 'Definite integrals' },
    ],
  },
  { code: '1.2', name: 'Functions', leaves: [] },
])
assert.deepEqual(topicTree(null), [])

const NAMES = topicIndex(TREE)
assert.deepEqual([...NAMES.keys()], ['5', '5.1', '5.4', '1.2'])
assert.equal(topicLabel('5.4', NAMES), 'Definite integrals (5.4)')
assert.equal(topicLabel('9.9', NAMES), '9.9')

assert.deepEqual(
  filterTopicTree(TREE, 'definite').map((g) => [g.code, g.leaves.map((l) => l.code)]),
  [['5', ['5.4']]]
)
assert.deepEqual(
  filterTopicTree(TREE, 'integration').map((g) => [g.code, g.leaves.length]),
  [['5', 2]],
  'a matching section keeps all its leaves'
)
assert.deepEqual(
  filterTopicTree(TREE, '1.').map((g) => g.code),
  ['1.2'],
  'codes match by prefix'
)
assert.equal(filterTopicTree(TREE, '  ').length, 2)
assert.equal(filterTopicTree(TREE, 'zzz').length, 0)

// --- papers ----------------------------------------------------------------------

const papers = paperChoices(
  {
    papers: [
      { paper: 3, name: 'Paper 3', components: ['32', '31'] },
      { paper: 1, name: 'Paper 1', components: ['12', '11'] },
      { paper: 9, name: 'Paper 9', components: [] },
    ],
    sessions: ['s24', 'w24', 'm25', 's23', 'W23', 'x99', 'm24'],
  },
  '9709'
)
assert.deepEqual(
  papers.components.map((g) => [g.label, g.options.map((o) => o.value)]),
  [
    ['Paper 1', ['9709/11', '9709/12']],
    ['Paper 3', ['9709/31', '9709/32']],
  ],
  'papers in order, empty papers dropped'
)
assert.deepEqual(
  papers.sessions.map((s) => s.value),
  [
    'February/March 2025',
    'October/November 2024',
    'May/June 2024',
    'February/March 2024',
    'October/November 2023',
    'May/June 2023',
  ],
  'newest first, unknown codes dropped, case folded'
)
assert.deepEqual(paperChoices(null, '9709'), { components: [], sessions: [] })

// --- prefill ---------------------------------------------------------------------

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const GONE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const SET = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const ctx = { topics: NAMES, activeStudentIds: new Set([A, B]) }

const reteach = parseComposerPrefill({ source: 'reteach', codes: '5.4,5.1,9.9,5.4,%', set: SET }, ctx)
assert.equal(reteach.source, 'reteach')
assert.equal(reteach.kind, 'topic_drill')
assert.deepEqual(reteach.topicCodes, ['5.4', '5.1'])
assert.equal(reteach.droppedCodes, 1, 'a code outside the syllabus is counted, a malformed one ignored')
assert.deepEqual(reteach.sourceRef, { codes: ['5.4', '5.1', '9.9'], set_id: SET })
assert.equal(reteach.title, 'Reteach: Definite integrals & Integration as reverse differentiation')

const group = parseComposerPrefill(
  { source: 'error_group', students: `${A.toUpperCase()},${GONE},not-an-id,${A}`, group: 'arithmetic:*' },
  ctx
)
assert.equal(group.kind, 'question_set', 'no codes: pick questions')
assert.deepEqual(group.studentIds, [A], 'active members only, case-folded, de-duplicated')
assert.equal(group.droppedStudents, 2)
assert.deepEqual(group.sourceRef, { group: 'arithmetic:*', students: 1 })
assert.equal(group.title, 'Group drill')

const repeated = parseComposerPrefill({ source: ['blindspot', 'reteach'], codes: ['5.4', '1.2'] }, ctx)
assert.equal(repeated.source, 'blindspot', 'first value wins')
assert.deepEqual(repeated.topicCodes, ['5.4', '1.2'], 'repeated params are joined')
assert.equal(repeated.title, 'Blindspot drill: Definite integrals & Functions')

const manual = parseComposerPrefill({}, ctx)
assert.deepEqual(manual, {
  source: 'manual',
  kind: 'question_set',
  topicCodes: [],
  studentIds: [],
  droppedStudents: 0,
  droppedCodes: 0,
  sourceRef: null,
  title: '',
})
assert.equal(parseComposerPrefill({ source: 'hacker' }, ctx).source, 'manual')
assert.equal(parseComposerPrefill({ source: 'reteach', group: 'x:<script>' }, ctx).sourceRef, null, 'a bad group key is dropped')

assert.equal(suggestTitle('reteach', ['5', '5.1', '5.4'], NAMES), 'Reteach: Integration & Integration as reverse differentiation +1')
assert.equal(suggestTitle('manual', ['5.4'], NAMES), '')
const long = new Map([['x', 'x'.repeat(200)]])
assert.ok(suggestTitle('reteach', ['x'], long).length <= 120)

// --- state → body --------------------------------------------------------------------

const base: ComposerState = {
  title: 'Integration homework',
  instructions: '  ',
  kind: 'question_set',
  questions: [
    { id: 'q1', paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3', total_marks: 6, preview: null },
  ],
  topics: [{ code: '5.4', per_topic: 3 }],
  papers: [{ paper_code: '9709/12', paper_session: 'May/June 2024' }],
  prompts: [
    { key: 'a', text: 'Explain why.', marks: '6' },
    { key: 'b', text: '   ', marks: '' },
    { key: 'c', text: 'Prove it.', marks: '' },
  ],
  target: 'all',
  studentIds: [A],
  dueAt: '2026-10-02T15:00:00.000Z',
  timedMinutes: '',
  isMock: false,
  allowLate: true,
}

assert.deepEqual(composerItems(base), [
  { item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3' },
])
assert.deepEqual(composerItems({ ...base, kind: 'topic_drill' }), [{ item_type: 'topic', topic_code: '5.4', per_topic: 3 }])
assert.deepEqual(composerItems({ ...base, kind: 'whole_paper' }), [
  { item_type: 'whole_paper', paper_code: '9709/12', paper_session: 'May/June 2024' },
])
assert.deepEqual(composerItems({ ...base, kind: 'practice_prompt' }), [
  { item_type: 'prompt', prompt_text: 'Explain why.', total_marks: 6 },
  { item_type: 'prompt', prompt_text: 'Prove it.' },
])
assert.equal(questionCount({ ...base, kind: 'topic_drill' }), 3, 'topics count their questions')
assert.equal(clampPerTopic(9), 4)
assert.equal(clampPerTopic(0), 1)
assert.equal(clampPerTopic(Number.NaN), 2)

assert.equal(parsePromptMarks(''), undefined)
assert.equal(parsePromptMarks('12'), 12)
assert.equal(parsePromptMarks('0'), 'invalid')
assert.equal(parsePromptMarks('101'), 'invalid')
assert.equal(parsePromptMarks('ten'), 'invalid')
assert.equal(parsePromptMarks('2.5'), 'invalid')
assert.equal(parseTimedMinutes(''), undefined)
assert.equal(parseTimedMinutes('45'), 45)
assert.equal(parseTimedMinutes('601'), 'invalid')
assert.equal(parseTimedMinutes('-5'), 'invalid')

assert.equal(composerIssue(base), null)
assert.deepEqual(composerIssue({ ...base, kind: 'practice_prompt', prompts: [{ key: 'a', text: 'x', marks: 'lots' }] }), {
  field: 'items.0',
  error: 'Marks for a prompt must be a whole number from 1 to 100.',
})
assert.equal(composerIssue({ ...base, timedMinutes: 'an hour' })?.field, 'settings.timed_minutes')
assert.equal(
  composerIssue({ ...base, kind: 'topic_drill', topics: Array.from({ length: 5 }, (_, i) => ({ code: `5.${i}`, per_topic: 3 })) })
    ?.field,
  'items',
  'over the 12-question cap'
)

const NOW = new Date('2026-09-25T12:00:00.000Z')
const body = buildDraftBody(
  { ...base, timedMinutes: '45', isMock: true, allowLate: false, target: 'picked', studentIds: [A, B] },
  { publish: true, source: 'reteach', sourceRef: { codes: ['5.4'] } }
)
assert.deepEqual(body, {
  title: 'Integration homework',
  kind: 'question_set',
  instructions: null,
  due_at: '2026-10-02T15:00:00.000Z',
  is_mock: true,
  items: [{ item_type: 'past_paper_question', paper_code: '9709/12', paper_session: 'May/June 2024', question_number: '3' }],
  settings: { allow_late: false, timed_minutes: 45 },
  publish: true,
  source: 'reteach',
  target: { student_ids: [A, B] },
  source_ref: { codes: ['5.4'] },
})
// The body the composer builds is one the route accepts.
const parsed = parseAssignmentDraft(body, NOW)
assert.ok(parsed.ok, parsed.ok ? '' : parsed.error)
if (parsed.ok) {
  assert.deepEqual(parsed.value.target, { student_ids: [A, B] })
  assert.equal(parsed.value.settings.timed_minutes, 45)
}
// …and the parser catches what the composer leaves to it.
const noStudents = parseAssignmentDraft(
  buildDraftBody({ ...base, target: 'picked', studentIds: [] }, { publish: true, source: 'manual', sourceRef: null }),
  NOW
)
assert.equal(noStudents.ok ? null : noStudents.field, 'target')
const noItems = parseAssignmentDraft(
  buildDraftBody({ ...base, questions: [] }, { publish: true, source: 'manual', sourceRef: null }),
  NOW
)
assert.equal(noItems.ok ? null : noItems.field, 'items')
const draftOk = parseAssignmentDraft(
  buildDraftBody({ ...base, questions: [], dueAt: null }, { publish: false, source: 'manual', sourceRef: null }),
  NOW
)
assert.ok(draftOk.ok, 'a draft needs neither items nor a due date')
const allBody = buildDraftBody(base, { publish: false, source: 'manual', sourceRef: null })
assert.equal(allBody.target, 'all')
assert.equal('source_ref' in allBody, false)
assert.deepEqual(allBody.settings, { allow_late: true }, 'no timer unless one is typed')

// --- steps --------------------------------------------------------------------------

assert.equal(composerStep('title'), 'title')
assert.equal(composerStep('instructions'), 'title')
assert.equal(composerStep('items.2'), 'what')
assert.equal(composerStep('items'), 'what')
assert.equal(composerStep('kind'), 'what')
assert.equal(composerStep('subject_code'), 'what')
assert.equal(composerStep('target'), 'who')
assert.equal(composerStep('due_at'), 'when')
assert.equal(composerStep('settings.timed_minutes'), 'when')
assert.equal(composerStep('body'), null)
assert.equal(composerStep(undefined), null)
assert.equal(itemIndex('items.3'), 3)
assert.equal(itemIndex('items'), null)

// --- editing a draft ------------------------------------------------------------------

const row = (position: number, over: Partial<AssignmentItem>): AssignmentItem => ({
  id: `item-${position}`,
  assignment_id: 'set',
  position,
  item_type: 'past_paper_question',
  mark_scheme_id: `ms-${position}`,
  paper_code: '9709/12',
  paper_session: 'May/June 2024',
  question_number: String(position + 1),
  total_marks: 5,
  syllabus_tags: ['5.4'],
  topic_code: null,
  prompt_text: null,
  ib_component_key: null,
  ...over,
})
const draftAssignment = {
  title: 'Integration drill',
  instructions: null,
  kind: 'topic_drill' as const,
  due_at: '2026-10-02T15:00:00.000Z',
  is_mock: false,
  settings: { timed_minutes: 30 },
  target: 'students' as const,
}
const drill = draftToComposerState({
  assignment: draftAssignment,
  items: [row(2, { topic_code: '5.1' }), row(0, { topic_code: '5.4' }), row(1, { topic_code: '5.4' })],
  studentIds: [A],
})
assert.deepEqual(drill.topics, [
  { code: '5.4', per_topic: 2 },
  { code: '5.1', per_topic: 1 },
], 'a drill comes back as its topics, with their question counts, in item order')
assert.deepEqual(drill.questions, [])
assert.equal(drill.target, 'picked')
assert.deepEqual(drill.studentIds, [A])
assert.equal(drill.timedMinutes, '30')
assert.equal(drill.allowLate, true, 'late work defaults on')
assert.equal(drill.instructions, '')
assert.equal(drill.prompts.length, 1, 'an empty prompt box is always there')

const qs = draftToComposerState({
  assignment: { ...draftAssignment, kind: 'question_set', target: 'all', settings: { allow_late: false } },
  items: [row(0, { mark_scheme_id: null }), row(1, {})],
  studentIds: [],
})
assert.deepEqual(
  qs.questions.map((q) => [q.id, q.question_number, q.total_marks]),
  [
    ['item-0', '1', 5],
    ['ms-1', '2', 5],
  ],
  'a question whose bank row was deleted keeps its paper reference'
)
assert.equal(qs.target, 'all')
assert.equal(qs.allowLate, false)
assert.equal(qs.timedMinutes, '')

const mixed = draftToComposerState({
  assignment: { ...draftAssignment, kind: 'practice_prompt', target: 'all', settings: {} },
  items: [
    row(0, { item_type: 'prompt', mark_scheme_id: null, paper_code: null, paper_session: null, question_number: null, prompt_text: 'Explain.', total_marks: 6 }),
    row(1, { item_type: 'prompt', mark_scheme_id: null, paper_code: null, paper_session: null, question_number: null, prompt_text: 'Prove.', total_marks: null }),
  ],
  studentIds: [],
})
assert.deepEqual(
  mixed.prompts.map((p) => [p.text, p.marks]),
  [
    ['Explain.', '6'],
    ['Prove.', ''],
  ]
)
const paper = draftToComposerState({
  assignment: { ...draftAssignment, kind: 'whole_paper', target: 'all', settings: {} },
  items: [row(0, { item_type: 'whole_paper', mark_scheme_id: null, question_number: null, total_marks: 75 })],
  studentIds: [],
})
assert.deepEqual(paper.papers, [{ paper_code: '9709/12', paper_session: 'May/June 2024' }])

// The patch it saves is one the route accepts, and round-trips the drill.
const patch = buildPatchBody(drill)
assert.deepEqual(patch, {
  title: 'Integration drill',
  instructions: null,
  due_at: '2026-10-02T15:00:00.000Z',
  is_mock: false,
  settings: { timed_minutes: 30, allow_late: true },
  items: [
    { item_type: 'topic', topic_code: '5.4', per_topic: 2 },
    { item_type: 'topic', topic_code: '5.1', per_topic: 1 },
  ],
})
const parsedPatch = parseAssignmentPatch(patch, { kind: 'topic_drill', published_at: null })
assert.ok(parsedPatch.ok, parsedPatch.ok ? '' : parsedPatch.error)
assert.deepEqual(buildPatchBody({ ...drill, timedMinutes: '' }).settings, { timed_minutes: null, allow_late: true }, 'an empty box clears the timer')
assert.equal('target' in patch || 'kind' in patch, false, 'who and what kind are fixed once saved')

console.log('composer-model.test.ts — all assertions passed')
