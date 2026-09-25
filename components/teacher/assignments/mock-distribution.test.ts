import assert from 'node:assert/strict'
import type { StudentAssignmentState } from '@/lib/teacher/types'
import {
  GRADE_ORDER,
  MOCK_MIN_MARKED,
  PERCENT_BANDS,
  mockDistribution,
} from '@/components/teacher/assignments/mock-distribution'

type Item = StudentAssignmentState['items'][number]
const cells = (...states: Item['state'][]): Item[] =>
  states.map((state, i) => ({ item_id: `i${i}`, state, marks_earned: null, total_marks: null, attempt_id: null }))
const st = (name: string, pct: number | null, over: Partial<StudentAssignmentState> = {}): StudentAssignmentState => ({
  student_id: name.toLowerCase(),
  display_name: name,
  membership: 'active',
  items: cells('done'),
  overall_pct: pct,
  is_late: false,
  excused: false,
  extended_due_at: null,
  feedback: null,
  ...over,
})

assert.equal(MOCK_MIN_MARKED, 3)
assert.deepEqual([...GRADE_ORDER], ['A*', 'A', 'B', 'C', 'D', 'E', 'U'])

const CLASS = [
  st('Amira K.', 85),
  st('Ben O.', 72.5),
  st('Cara L.', 71),
  st('Dev P.', 58),
  st('Eli R.', 12),
  st('Fay T.', 90, { items: cells('done', 'missing') }), // part-way: not a mock grade
  st('Gus H.', null, { items: cells('missing') }), // still to come
  st('Hal J.', null, { items: cells('excused'), excused: true }), // excused: not "to come"
  st('Ivy M.', null, { items: cells('left'), membership: 'left' }), // left: not "to come"
  st('Jo N.', 64, { items: cells('late') }), // late still counts
  st('Kit Q.', 40, { items: cells('reviewed') }),
]

const letters = mockDistribution(CLASS, { letterGrades: true })
assert.equal(letters.scale, 'grades')
assert.equal(letters.marked, 7)
assert.equal(letters.unmarked, 2, 'part-way and not started, but not excused or departed')
assert.equal(letters.enough, true)
assert.deepEqual(
  letters.bins.map((b) => [b.label, b.count]),
  [
    ['A*', 1],
    ['A', 2],
    ['B', 1],
    ['C', 1],
    ['D', 1],
    ['E', 0],
    ['U', 1],
  ]
)
assert.deepEqual(letters.bins[1].names, ['Ben O.', 'Cara L.'], 'names sorted within a bin')
assert.equal(letters.median_pct, 64)

const bands = mockDistribution(CLASS, { letterGrades: false })
assert.equal(bands.scale, 'percent')
assert.deepEqual(
  bands.bins.map((b) => b.label),
  PERCENT_BANDS.map(([l]) => l)
)
assert.deepEqual(
  bands.bins.map((b) => b.count),
  [1, 2, 1, 1, 1, 1]
)

const thin = mockDistribution([st('A', 50), st('B', 60)], { letterGrades: true })
assert.equal(thin.enough, false, 'two scripts are not a distribution')
assert.equal(thin.marked, 2)
assert.equal(thin.median_pct, 55)

const none = mockDistribution([], { letterGrades: true })
assert.equal(none.marked, 0)
assert.equal(none.median_pct, null)
assert.equal(none.bins.every((b) => b.count === 0), true)

// Boundaries are inclusive at the floor.
const edges = mockDistribution([st('A', 80), st('B', 79.9), st('C', 30), st('D', 29.9)], { letterGrades: true })
assert.deepEqual(
  edges.bins.filter((b) => b.count).map((b) => [b.label, b.names]),
  [
    ['A*', ['A']],
    ['A', ['B']],
    ['E', ['C']],
    ['U', ['D']],
  ]
)

console.log('mock-distribution.test.ts — all assertions passed')
