import assert from 'node:assert/strict'
import { extractActionFromText } from '@/lib/omni-ai/actions'
import {
  TEACHER_HREF_MAX,
  isTeacherOmniView,
  resolveTeacherOmniAddress,
  restrictTeacherAction,
  teacherCtaHref,
  teacherOmniContext,
  teacherOmniContextData,
} from '@/lib/teacher/insights/omni'

const CLASS = '0b8f7c1e-1111-4222-8333-444455556666'

// --- what a page sends ------------------------------------------------------------------

assert.deepEqual(teacherOmniContextData({ classroomId: CLASS, view: 'gaps' }), { view: 'gaps', classroom_id: CLASS })
assert.deepEqual(
  teacherOmniContextData({ classroomId: CLASS.toUpperCase(), view: 'week' }),
  { view: 'week', classroom_id: CLASS },
  'ids are sent lower-case'
)
assert.deepEqual(teacherOmniContextData({ classroomId: CLASS, view: 'desk' }), { view: 'desk' }, 'the desk carries no class')
assert.deepEqual(teacherOmniContextData({ classroomId: 'not-a-uuid', view: 'students' }), { view: 'students' })
assert.deepEqual(teacherOmniContext({ classroomId: CLASS, view: 'student' }), {
  type: 'teacher_dashboard',
  data: { view: 'student', classroom_id: CLASS },
})

assert.ok(isTeacherOmniView('gaps'))
assert.ok(!isTeacherOmniView('landing'))
assert.ok(!isTeacherOmniView(null))

// --- resolving an address ----------------------------------------------------------------

assert.deepEqual(resolveTeacherOmniAddress({ classroomId: CLASS, view: undefined }), { classroomId: CLASS, view: 'week' })
assert.deepEqual(resolveTeacherOmniAddress({ classroomId: null, view: undefined }), { classroomId: null, view: 'desk' })
assert.deepEqual(resolveTeacherOmniAddress({ classroomId: CLASS, view: 'desk' }), { classroomId: null, view: 'desk' })
assert.deepEqual(
  resolveTeacherOmniAddress({ classroomId: null, view: 'gaps' }),
  { classroomId: null, view: 'desk' },
  'a class view without a class is the desk'
)
assert.deepEqual(
  resolveTeacherOmniAddress({ classroomId: null, view: 'reviews' }),
  { classroomId: null, view: 'reviews' },
  'the review inbox is not about one class'
)
assert.deepEqual(
  resolveTeacherOmniAddress({ classroomId: CLASS, view: 'no-such-view' }),
  { classroomId: CLASS, view: 'week' },
  'an unknown view is cosmetic, not an error'
)

// --- the CTA allowlist -------------------------------------------------------------------

assert.equal(teacherCtaHref('/teacher/dashboard'), '/teacher/dashboard')
assert.equal(
  teacherCtaHref(`/teacher/classroom/${CLASS}/assignments/new?source=blindspot&codes=3.1,3.2`),
  `/teacher/classroom/${CLASS}/assignments/new?source=blindspot&codes=3.1,3.2`
)
assert.equal(teacherCtaHref('/teacher/reviews?classroom_id=x#top'), '/teacher/reviews?classroom_id=x#top')

for (const hostile of [
  'https://evil.example/teacher/x', // off-origin
  '//evil.example/teacher/x', // protocol-relative
  '/\\evil.example', // backslash normalised to //
  'javascript:alert(1)',
  '/dashboard', // same origin, but not a teacher page
  '/auth/signout',
  '/teacher', // the prefix is /teacher/, not /teacher
  '/teachers/evil',
  '/teacher/../auth/signout', // dot segments resolve outside
  '/teacher/%2e%2e/auth/signout', // …and so do their encoded spellings
  '/teacher/%2E%2E/%2e%2e/api/x',
  '/teacher/ x', // whitespace
  '/teacher/\u0000x', // control characters
  `/teacher/${'a'.repeat(TEACHER_HREF_MAX)}`, // absurd length
  '',
  null,
  undefined,
  42,
]) {
  assert.equal(teacherCtaHref(hostile), null, `refused: ${String(hostile)}`)
}
assert.equal(
  teacherCtaHref('/teacher/classroom/./x/../y'),
  '/teacher/classroom/y',
  'the rendered href is the normalised one'
)

// --- actions a teacher view may render ---------------------------------------------------

{
  const { action } = extractActionFromText(
    `Here you go.\n[[ACTION:render_cta|text=Set a drill|href=/teacher/classroom/${CLASS}/assignments/new?codes=3.1]]`
  )
  const safe = restrictTeacherAction(action)
  assert.equal(safe?.type, 'render_cta')
  assert.equal(safe?.cta?.href, `/teacher/classroom/${CLASS}/assignments/new?codes=3.1`)
  assert.equal(safe?.params?.href, safe?.cta?.href, 'the directive and the button agree')
  assert.equal(safe?.cta?.text, 'Set a drill')
}
{
  // Same-origin but not a teacher page: the generic parser allows it, a teacher view does not.
  const { action } = extractActionFromText('[[ACTION:render_cta|text=Claim refund|href=/billing/refund]]')
  assert.equal(action?.type, 'render_cta')
  assert.equal(restrictTeacherAction(action), null)
}
{
  // Off-origin: already dropped by the generic parser (type 'none'); still nothing here.
  const { action } = extractActionFromText('[[ACTION:render_cta|text=Log in|href=https://evil.example/teacher/]]')
  assert.equal(restrictTeacherAction(action), null)
}
{
  // A CTA with no href would render the signup link — never for a teacher.
  const { action } = extractActionFromText('[[ACTION:render_cta|text=Get started]]')
  assert.equal(action?.cta?.href, '/auth/signup')
  assert.equal(restrictTeacherAction(action), null)
}
{
  // A CTA with no label is not a button anyone can read.
  assert.equal(
    restrictTeacherAction({ type: 'render_cta', params: { href: '/teacher/dashboard' } }),
    null
  )
}
{
  // Student-facing cards are dropped; a past-paper card is fine.
  assert.equal(restrictTeacherAction(extractActionFromText('[[ACTION:render_upload]]').action), null)
  assert.equal(
    restrictTeacherAction(extractActionFromText('[[ACTION:render_diagnostic|topic_hint=Vectors]]').action),
    null
  )
  const paper = restrictTeacherAction(
    extractActionFromText('[[ACTION:render_paper|paper_code=9709/12|paper_session=May/June 2024|question_number=1]]')
      .action
  )
  assert.equal(paper?.type, 'render_paper')
  assert.equal(restrictTeacherAction(null), null)
}

console.log('lib/teacher/insights/omni.test.ts — all assertions passed')
