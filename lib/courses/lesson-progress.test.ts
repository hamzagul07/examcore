import {
  dwellTargetFor,
  isSectionRead,
  progressPercent,
  readSectionIds,
  toStored,
  fromStored,
  MIN_DWELL_MS,
  MAX_DWELL_MS,
  type SectionState,
} from './lesson-progress'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const s = (over: Partial<SectionState> = {}): SectionState => ({
  id: 'a',
  dwellMs: 0,
  heightPx: 400,
  ...over,
})

// ── Dwell targets scale with length ─────────────────────────────────────────
check('short section uses the floor', dwellTargetFor(80) === MIN_DWELL_MS)
check('long section is capped', dwellTargetFor(100000) === MAX_DWELL_MS)
check('a taller section needs longer', dwellTargetFor(1500) > dwellTargetFor(400))
check('monotonic', dwellTargetFor(2000) >= dwellTargetFor(1000))
// Degenerate measurements must not make everything instantly read.
check('zero height falls back to the floor', dwellTargetFor(0) === MIN_DWELL_MS)
check('NaN height falls back to the floor', dwellTargetFor(Number.NaN) === MIN_DWELL_MS)
check('negative height falls back to the floor', dwellTargetFor(-50) === MIN_DWELL_MS)

// ── Reading ─────────────────────────────────────────────────────────────────
check('no dwell is not read', !isSectionRead(s()))
check('brief glance is not read', !isSectionRead(s({ dwellMs: 300 })))
check('enough dwell is read', isSectionRead(s({ dwellMs: 9000 })))
check('exactly at target counts', isSectionRead(s({ heightPx: 80, dwellMs: MIN_DWELL_MS })))

// Doing something always counts, however briefly — answering a quick check is
// stronger evidence than any amount of looking.
check('interaction counts regardless of dwell', isSectionRead(s({ interacted: true })))
check('interaction beats a huge section', isSectionRead(s({ heightPx: 99999, interacted: true })))

// ── Percentage ──────────────────────────────────────────────────────────────
const four = [
  s({ id: '1', dwellMs: 9000 }),
  s({ id: '2', dwellMs: 9000 }),
  s({ id: '3' }),
  s({ id: '4' }),
]
check('half read is 50', progressPercent(four) === 50)
check('none read is 0', progressPercent([s({ id: 'x' })]) === 0)
check('no sections is 0, not NaN', progressPercent([]) === 0)
check(
  'all read is exactly 100',
  progressPercent(four.map((x) => ({ ...x, dwellMs: 9000 }))) === 100
)

// Never round up to a number that overstates what is finished: 2 of 3 is 66,
// and 100 must mean genuinely everything.
check('rounds down', progressPercent([s({ id: '1', dwellMs: 9000 }), s({ id: '2', dwellMs: 9000 }), s({ id: '3' })]) === 66)
check(
  'never reports 100 while one is unread',
  progressPercent([
    ...Array.from({ length: 99 }, (_, i) => s({ id: `r${i}`, dwellMs: 9000 })),
    s({ id: 'last' }),
  ]) < 100
)

check('read ids listed', readSectionIds(four).join(',') === '1,2')

// ── Persistence ─────────────────────────────────────────────────────────────
const stored = toStored([s({ id: 'a', dwellMs: 3000 }), s({ id: 'b', interacted: true })])
check('dwell persisted', stored.a.d === 3000)
check('interaction persisted', stored.b.i === 1)
// A stored dwell must not be able to pre-complete a section that has since grown.
check('stored dwell is capped', toStored([s({ id: 'a', dwellMs: 999999 })]).a.d === MAX_DWELL_MS)

const restored = fromStored(stored, ['a', 'b', 'c'], { a: 400, b: 400, c: 400 })
check('restores every requested id', restored.map((r) => r.id).join(',') === 'a,b,c')
check('restores dwell', restored[0].dwellMs === 3000)
check('restores interaction', restored[1].interacted === true)
check('unknown id starts empty', restored[2].dwellMs === 0 && !restored[2].interacted)
check('missing store is safe', fromStored(null, ['a'], {})[0].dwellMs === 0)
// Corrupt storage must not produce negative dwell or NaN progress.
check(
  'negative stored dwell is clamped',
  fromStored({ a: { d: -500 } }, ['a'], { a: 400 })[0].dwellMs === 0
)

if (failed > 0) process.exit(1)
console.log('lesson-progress.test.ts: all checks passed')
