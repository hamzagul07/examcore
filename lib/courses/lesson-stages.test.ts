import { stagesFor, clampStage, stagePercent, type Stage } from './lesson-stages'
import type { MarginNotesLesson } from '@/lib/courses/margin-notes/types'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const lesson = (over: Partial<MarginNotesLesson> = {}) =>
  ({ hasDiagram: false, ...over }) as MarginNotesLesson

// ── Which stages exist ──────────────────────────────────────────────────────
const full = lesson({
  simple: { lead: 'x', analogy: '' },
  hasDiagram: true,
  notes: [{ h: 'a', p: 'b' }],
  quiz: [{ q: 'q', a: 'a' }],
  worked: [{ title: 'w', q: 'q', steps: ['s'] }],
} as Partial<MarginNotesLesson>)
check('full lesson has all five', stagesFor(full).map((s) => s.id).join(',') === 'orient,see,read,check,prove')

// An empty stage in a path is worse than an empty section in a document: the
// path implies every step is necessary, so a step with nothing in it is a lie.
check('no diagram drops See', !stagesFor(lesson({ notes: [{ h: 'a', p: 'b' }] } as Partial<MarginNotesLesson>)).some((s) => s.id === 'see'))
check('no quiz drops Check', !stagesFor(full && lesson({ hasDiagram: true } as Partial<MarginNotesLesson>)).some((s) => s.id === 'check'))
check('empty lesson has no stages', stagesFor(lesson()).length === 0)

// Objectives alone are enough to orient; simple alone is too.
check('objectives alone give Orient', stagesFor(lesson({ objectives: ['o'] } as Partial<MarginNotesLesson>)).some((s) => s.id === 'orient'))
check('simple alone gives Orient', stagesFor(lesson({ simple: { lead: 'x', analogy: '' } } as Partial<MarginNotesLesson>)).some((s) => s.id === 'orient'))

// Prove accepts any of its three sources.
for (const key of ['worked', 'practice', 'practiceQuestions'] as const) {
  const value = key === 'practice'
    ? ({ ref: 'r', marks: 1, text: 't', href: '/h' } as never)
    : ([{ ref: 'r', marks: 1, text: 't', href: '/h' }] as never)
  const has = stagesFor(lesson({ [key]: value } as Partial<MarginNotesLesson>)).some((s) => s.id === 'prove')
  if (!has) {
    failed++
    console.error(`FAIL ${key} should give Prove`)
  }
}
check('prove sources all count', true)

// Order is the order learning happens, and must not depend on which are present.
const sparse = stagesFor(lesson({ hasDiagram: true, quiz: [{ q: 'q', a: 'a' }] } as Partial<MarginNotesLesson>))
check('order is preserved when stages are skipped', sparse.map((s) => s.id).join(',') === 'see,check')

// ── Index clamping ──────────────────────────────────────────────────────────
check('negative clamps to first', clampStage(-3, 5) === 0)
check('overflow clamps to last', clampStage(99, 5) === 4)
check('in range passes through', clampStage(2, 5) === 2)
check('no stages is index 0', clampStage(3, 0) === 0)

// ── Percentage ──────────────────────────────────────────────────────────────
const five = stagesFor(full)
check('none done is 0', stagePercent(five, new Set()) === 0)
check('all done is exactly 100', stagePercent(five, new Set(five.map((s) => s.id))) === 100)
check('two of five is 40', stagePercent(five, new Set(['orient', 'see'])) === 40)
// Must never claim completion while a stage is outstanding.
check('four of five is not 100', stagePercent(five, new Set(['orient', 'see', 'read', 'check'])) < 100)
check('no stages is 0, not NaN', stagePercent([] as Stage[], new Set()) === 0)
// Unknown ids in the done set must not inflate the count.
check('unknown ids ignored', stagePercent(five, new Set(['nope', 'orient'])) === 20)

if (failed > 0) process.exit(1)
console.log('lesson-stages.test.ts: all checks passed')
