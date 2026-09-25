import assert from 'node:assert/strict'
import type { StudentAssignmentState } from '@/lib/teacher/types'
import {
  KIND_LABEL,
  KIND_STAMP,
  barFromStates,
  barFromSummary,
  barSummary,
  barWidths,
  dueThisWeekNote,
  errorGroupMeta,
  errorGroupStamp,
  groupStudentsLine,
  itemCountLabel,
  lateLine,
  lateNames,
  setTopicCodes,
  sourceLabel,
  tallyText,
} from '@/components/teacher/assignments/set-display'
import {
  PREFILL_MAX_CODES,
  PREFILL_MAX_STUDENTS,
  classHref,
  composerHref,
  editDraftHref,
  exportHref,
  printHref,
  reviewHref,
  reviewsHref,
  setHref,
  setsHref,
  studentHref,
} from '@/components/teacher/assignments/links'

// --- stamps and labels -----------------------------------------------------------

assert.deepEqual(KIND_STAMP, { question_set: 'Q', whole_paper: 'PPR', topic_drill: 'DRL', practice_prompt: 'PRM' })
assert.equal(KIND_LABEL.topic_drill, 'Topic drill')
assert.equal(sourceLabel('reteach'), 'From a reteach card')
assert.equal(sourceLabel('error_group'), 'For an error group')
assert.equal(sourceLabel('blindspot'), 'From a blindspot')
assert.equal(sourceLabel('manual'), null)
assert.equal(sourceLabel(null), null)
assert.equal(itemCountLabel('question_set', 4), '4 questions')
assert.equal(itemCountLabel('topic_drill', 1), '1 question')
assert.equal(itemCountLabel('whole_paper', 1), '1 paper')
assert.equal(itemCountLabel('practice_prompt', 2), '2 prompts')
assert.equal(tallyText({ handed_in: 18, total_students: 24 }), '18/24')

// --- the bar from states ------------------------------------------------------------

type Item = StudentAssignmentState['items'][number]
const cells = (...states: Item['state'][]): Item[] =>
  states.map((state, i) => ({ item_id: `i${i}`, state, marks_earned: null, total_marks: null, attempt_id: null }))
const st = (over: Partial<StudentAssignmentState>): StudentAssignmentState => ({
  student_id: 's',
  display_name: 'S',
  membership: 'active',
  items: cells('missing'),
  overall_pct: null,
  is_late: false,
  excused: false,
  extended_due_at: null,
  feedback: null,
  ...over,
})

const STATES = [
  st({ display_name: 'Amira K.', items: cells('done', 'reviewed') }), // done
  st({ display_name: 'Ben O.', items: cells('late', 'done'), is_late: true }), // late, complete
  st({ display_name: 'Ari B.', items: cells('late', 'missing'), is_late: true }), // late, part-way
  st({ display_name: 'Cara L.', items: cells('done', 'missing') }), // owing (part-way)
  st({ display_name: 'Dev P.', items: cells('missing', 'missing') }), // owing
  st({ display_name: 'Eli R.', items: cells('excused', 'excused'), excused: true }), // excused
  st({ display_name: 'Fay T.', items: cells('left', 'left'), membership: 'left' }), // left
]

const bar = barFromStates(STATES)
assert.deepEqual(bar, { total: 7, done: 1, late: 2, owing: 2, excused: 1, left: 1, exact: true })
assert.equal(bar.done + bar.late + bar.owing + bar.excused + bar.left, bar.total)
assert.equal(
  barSummary(bar),
  '1 on time, 2 late, 2 still to hand in, 1 excused, 1 left the class (of 7).'
)
assert.equal(barSummary(barFromStates([])), 'Nobody is on this set yet.')
assert.deepEqual(barFromStates([st({ items: [] })]), {
  total: 1,
  done: 0,
  late: 0,
  owing: 1,
  excused: 0,
  left: 0,
  exact: true,
})

// --- the bar from counts (approximate) ----------------------------------------------

assert.deepEqual(barFromSummary({ handed_in: 18, late: 3, total_students: 24 }), {
  total: 24,
  done: 15,
  late: 3,
  owing: 6,
  excused: 0,
  left: 0,
  exact: false,
})
// Late students who are only part-way through: done floors at zero, nothing overflows.
assert.deepEqual(barFromSummary({ handed_in: 1, late: 4, total_students: 5 }), {
  total: 5,
  done: 0,
  late: 4,
  owing: 1,
  excused: 0,
  left: 0,
  exact: false,
})
assert.deepEqual(barFromSummary({ handed_in: 0, late: 9, total_students: 3 }).late, 3, 'clamped to the roster')
assert.equal(barSummary(barFromSummary({ handed_in: 2, late: 0, total_students: 4 })), '2 on time, 0 late, 2 still to hand in (of 4).')

// --- widths -------------------------------------------------------------------------

assert.deepEqual(barWidths({ total: 0, done: 0, late: 0, owing: 0 }), { done: 0, late: 0, owing: 0 })
assert.deepEqual(barWidths({ total: 3, done: 1, late: 1, owing: 1 }), { done: 34, late: 33, owing: 33 })
assert.deepEqual(barWidths({ total: 4, done: 4, late: 0, owing: 0 }), { done: 100, late: 0, owing: 0 })
const tiny = barWidths({ total: 300, done: 298, late: 1, owing: 1 })
assert.ok(tiny.late >= 1 && tiny.owing >= 1, 'one student is never invisible')
assert.ok(tiny.done + tiny.late + tiny.owing <= 100)
const partial = barWidths({ total: 10, done: 3, late: 1, owing: 2 }) // 4 excused / left
assert.deepEqual(partial, { done: 30, late: 10, owing: 20 })

// --- late names ---------------------------------------------------------------------

assert.deepEqual(lateNames(STATES), ['Ari B.', 'Ben O.'])
assert.equal(lateLine(['Amira K.', 'Ben O.', 'Cara L.'], 3), '3 late: Amira K., Ben O., +1')
assert.equal(lateLine(['Amira K.'], 1), '1 late: Amira K.')
assert.equal(lateLine(['Amira K.', 'Ben O.'], 2), '2 late: Amira K., Ben O.')
assert.equal(lateLine([], 3), '3 late', 'counts without names')
assert.equal(lateLine([], 0), null)
assert.equal(lateLine(['Amira K.'], 0), '1 late: Amira K.', 'names are never hidden by a stale count')
assert.equal(lateLine(['A', 'B', 'C', 'D'], 4, 3), '4 late: A, B, C, +1')

// --- the head's note -----------------------------------------------------------------

const START = '2026-09-21T00:00:00.000Z'
const END = '2026-09-28T00:00:00.000Z'
assert.equal(
  dueThisWeekNote(
    [{ due_at: '2026-09-25T15:00:00Z' }, { due_at: '2026-09-27T23:59:59Z' }, { due_at: '2026-09-28T00:00:00Z' }, { due_at: null }],
    START,
    END
  ),
  '2 sets due this week'
)
assert.equal(dueThisWeekNote([{ due_at: '2026-09-21T00:00:00Z' }], START, END), '1 set due this week')
assert.equal(dueThisWeekNote([], START, END), 'nothing due this week')

// --- the topics a set covered -------------------------------------------------------

assert.deepEqual(
  setTopicCodes([
    { position: 2, topic_code: null, syllabus_tags: ['2.1', '5.4'] },
    { position: 0, topic_code: '5.4', syllabus_tags: ['5.4', '5.5'] },
    { position: 1, topic_code: '3.2', syllabus_tags: null },
  ]),
  ['5.4', '3.2', '5.5', '2.1'],
  'drill topics first, then tags, in item order, without repeats'
)
assert.deepEqual(setTopicCodes([{ position: 0, topic_code: ' ', syllabus_tags: ['1', '2', '3'] }], 2), ['1', '2'])
assert.deepEqual(setTopicCodes([]), [])

// --- error groups ------------------------------------------------------------------

assert.equal(errorGroupStamp('conceptual'), 'CON')
assert.equal(errorGroupStamp('time_pressure'), 'TIM')
assert.equal(errorGroupStamp('something_new'), 'ERR')
assert.equal(errorGroupMeta(4, 11), '4 students · 11 marks lost')
assert.equal(errorGroupMeta(1, 1), '1 student · 1 mark lost')
const NAMES = { a: 'Amira K.', b: 'Ben O.', c: 'Cara L.', d: 'Dev P.', e: 'Eli R.' }
assert.equal(groupStudentsLine(['e', 'a', 'c'], NAMES), 'Amira K., Cara L., Eli R.')
assert.equal(groupStudentsLine(['e', 'a', 'c', 'b', 'd'], NAMES), 'Amira K., Ben O., Cara L., Dev P., +1')
assert.equal(groupStudentsLine(['a', 'gone'], NAMES), 'Amira K., +1', 'an unnamed student is counted, not shown as "Student"')
assert.equal(groupStudentsLine(['x', 'y'], NAMES), '2 students')

// --- links ----------------------------------------------------------------------------

const C = '11111111-1111-4111-8111-111111111111'
const A = '22222222-2222-4222-8222-222222222222'
assert.equal(classHref(C), `/teacher/classroom/${C}`)
assert.equal(classHref(C, '2026-W38'), `/teacher/classroom/${C}?week=2026-W38`)
assert.equal(setsHref(C), `/teacher/classroom/${C}/assignments`)
assert.equal(setsHref(C, 'open'), `/teacher/classroom/${C}/assignments`, 'open is the default tab')
assert.equal(setsHref(C, 'draft'), `/teacher/classroom/${C}/assignments?status=draft`)
assert.equal(setHref(C, A), `/teacher/classroom/${C}/assignments/${A}`)
assert.equal(printHref(C, A), `/teacher/classroom/${C}/assignments/${A}/print`)
assert.equal(editDraftHref(C, A), `/teacher/classroom/${C}/assignments/new?draft=${A}`)
assert.equal(studentHref(C, 'x y'), `/teacher/classroom/${C}/students/x%20y`, 'ids are encoded')
assert.equal(reviewHref(A), `/teacher/reviews/${A}`)
assert.equal(reviewsHref(C), `/teacher/reviews?classroom_id=${C}`)
assert.equal(reviewsHref(C, A), `/teacher/reviews?classroom_id=${C}&assignment_id=${A}`)
assert.equal(exportHref(C), `/api/teacher/classroom/${C}/export?scope=assignments`)

assert.equal(composerHref(C), `/teacher/classroom/${C}/assignments/new`)
assert.equal(composerHref(C, { source: 'manual' }), `/teacher/classroom/${C}/assignments/new`)
const reteach = new URL(`https://x${composerHref(C, { source: 'reteach', codes: ['5.4', ' 5.5', '5.4', ''], set: A })}`)
assert.equal(reteach.searchParams.get('source'), 'reteach')
assert.equal(reteach.searchParams.get('codes'), '5.4,5.5', 'deduplicated and trimmed')
assert.equal(reteach.searchParams.get('set'), A)
const group = new URL(
  `https://x${composerHref(C, { source: 'error_group', students: ['b', 'a', 'b'], codes: ['3.4'], group: 'conceptual:3.4' })}`
)
assert.equal(group.searchParams.get('students'), 'b,a')
assert.equal(group.searchParams.get('group'), 'conceptual:3.4')
const many = Array.from({ length: PREFILL_MAX_CODES + 3 }, (_, i) => `${i + 1}.1`)
assert.equal(new URL(`https://x${composerHref(C, { codes: many })}`).searchParams.get('codes')?.split(',').length, PREFILL_MAX_CODES)
const crowd = Array.from({ length: PREFILL_MAX_STUDENTS + 1 }, (_, i) => `s${i}`)
assert.equal(
  new URL(`https://x${composerHref(C, { source: 'error_group', students: crowd })}`).searchParams.get('students'),
  null,
  'a group bigger than a URL can carry prefills nobody rather than a truncated list'
)

console.log('set-display.test.ts — all assertions passed')
