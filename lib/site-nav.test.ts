import assert from 'node:assert/strict'
import {
  TEACHER_ACCOUNT_NAV,
  TEACHER_DESK_NAV,
  TEACHER_LEGACY_NAV,
  TEACHER_NAV_ITEM,
  teacherNavItems,
} from '@/lib/site-nav'

function activeIds(items: readonly { id: string; isActive: (p: string) => boolean }[], path: string) {
  return items.filter((i) => i.isActive(path)).map((i) => i.id)
}

// --- v2 teacher frame: Desk · Classes · Reviews ------------------------------

assert.deepEqual(
  TEACHER_DESK_NAV.map((i) => [i.label, i.stamp, i.href]),
  [
    ['Desk', 'DK', '/teacher/dashboard'],
    ['Classes', 'CL', '/teacher/classrooms'],
    ['Reviews', 'RV', '/teacher/reviews'],
  ]
)

for (const [path, expected] of [
  ['/teacher/dashboard', ['desk']],
  ['/teacher/classrooms', ['classes']],
  ['/teacher/classrooms/new', ['classes']],
  ['/teacher/classroom/abc', ['classes']],
  ['/teacher/classroom/abc/assignments/new', ['classes']],
  ['/teacher/classroom/abc/settings', ['classes']],
  ['/teacher/reviews', ['reviews']],
  ['/teacher/reviews/123', ['reviews']],
  // Prefix lookalikes must not light anything up.
  ['/teacher/dashboards', []],
  ['/teacher/reviewsx', []],
  ['/teacher', []],
] as const) {
  assert.deepEqual(activeIds(TEACHER_DESK_NAV, path), expected, path)
}

assert.equal(TEACHER_ACCOUNT_NAV.isActive('/account'), true)
assert.equal(TEACHER_ACCOUNT_NAV.isActive('/account/preferences'), true)
assert.equal(TEACHER_ACCOUNT_NAV.isActive('/accounting'), false)

// --- kill switch: the pre-v2 nav comes back unchanged --------------------------

assert.equal(teacherNavItems(true), TEACHER_DESK_NAV)
assert.equal(teacherNavItems(false), TEACHER_LEGACY_NAV)
assert.deepEqual(activeIds(TEACHER_LEGACY_NAV, '/teacher/dashboard'), ['classes'])
assert.deepEqual(activeIds(TEACHER_LEGACY_NAV, '/teacher/classroom/abc'), ['classes'])
assert.deepEqual(activeIds(TEACHER_LEGACY_NAV, '/teacher/reviews/1'), ['reviews'])

// --- the student header's way back to the teacher side --------------------------

assert.equal(TEACHER_NAV_ITEM.href, '/teacher/dashboard')
assert.ok(!TEACHER_NAV_ITEM.label.includes(' '), 'one word, so the row still fits at 1024px')
assert.equal(TEACHER_NAV_ITEM.isActive('/teacher/reviews'), true)

console.log('site-nav.test.ts — all assertions passed')
