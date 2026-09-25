import assert from 'node:assert/strict'
import {
  QUADRANT_ACCURACY_THRESHOLD,
  computeQuadrant,
  paceDivider,
  type StudentQuadrantMetric,
} from '@/lib/teacher-analytics'
import {
  PLOT,
  UNTIMED_LANE,
  accuracyToY,
  formatPace,
  hashUnit,
  jitter,
  layoutRiskMatrix,
  paceToX,
  pointLabel,
  riskTableOrder,
} from '@/lib/teacher/insights/risk-matrix'

function student(id: string, accuracy: number, timePerMark: number | null, name = id): Omit<StudentQuadrantMetric, 'quadrant'> {
  return {
    studentId: id,
    name,
    accuracy,
    timePerMark,
    coverage: null,
    predictedGrade: 'B',
    biggestDeficit: null,
    attemptCount: 4,
  }
}

/** Quadrants exactly as lib/teacher-analytics assigns them. */
function classOf(rows: Array<Omit<StudentQuadrantMetric, 'quadrant'>>): StudentQuadrantMetric[] {
  const divider = paceDivider(rows)
  return rows.map((r) => ({ ...r, quadrant: computeQuadrant(r.accuracy, r.timePerMark, divider) }))
}

function layout(students: StudentQuadrantMetric[]) {
  return layoutRiskMatrix(students, { divider: paceDivider(students), threshold: QUADRANT_ACCURACY_THRESHOLD })
}

// --- building blocks --------------------------------------------------------------------

for (const id of ['a', 'b', 'student-123', '']) {
  const u = hashUnit(id)
  assert.ok(u >= 0 && u < 1, 'hashUnit is in [0, 1)')
  assert.equal(hashUnit(id), u, 'and stable')
  assert.ok(Math.abs(jitter(id, 3)) <= 3)
}
assert.equal(jitter('x', 0), 0)
assert.notEqual(hashUnit('amira'), hashUnit('ben'), 'different ids spread out')

assert.equal(accuracyToY(100), PLOT.top, '100% is the top of the plot')
assert.equal(accuracyToY(0), PLOT.bottom, '0% is the bottom')
assert.equal(accuracyToY(150), PLOT.top, 'clamped above')
assert.equal(accuracyToY(-5), PLOT.bottom, 'clamped below')
assert.equal(accuracyToY(Number.NaN), PLOT.bottom, 'NaN is not a position')
assert.ok(accuracyToY(80) < accuracyToY(40), 'more accurate is higher up')

{
  const area = { left: 20, right: 98 }
  const range = { fastest: 0.5, slowest: 4 }
  assert.ok(paceToX(0.5, range, area) > paceToX(4, range, area), 'faster is further right')
  assert.ok(paceToX(1, range, area) > paceToX(2, range, area))
  assert.equal(paceToX(0.1, range, area), paceToX(0.5, range, area), 'clamped to the range')
  const same = paceToX(2, { fastest: 2, slowest: 2 }, area)
  assert.equal(same, 59, 'one pace for everyone sits mid-area')
}

assert.equal(formatPace(1.44), '1.4 min per mark')
assert.equal(formatPace(12.6), '13 min per mark')
assert.equal(formatPace(null), 'untimed')
assert.equal(formatPace(0), 'untimed')

// --- pace mode: enough timed students for a class median ---------------------------------

{
  const students = classOf([
    student('fast-accurate', 90, 0.8, 'Amira Khan'),
    student('slow-accurate', 88, 3.0, 'Ben Okafor'),
    student('fast-weak', 40, 0.7, 'Cara Lee'),
    student('slow-weak', 35, 3.5, 'Dev Patel'),
    student('untimed-weak', 30, null, 'Eli Ross'),
    student('untimed-strong', 95, null, 'Fay Wu'),
  ])
  const l = layout(students)
  assert.equal(l.mode, 'pace')
  assert.equal(l.timedCount, 4)
  assert.equal(l.untimedCount, 2)
  assert.deepEqual(l.untimedLane, { left: UNTIMED_LANE.left, right: UNTIMED_LANE.right })
  assert.ok(l.divider, 'a class-median divider is drawn')
  assert.equal(l.regions.length, 4)

  const by = new Map(l.points.map((p) => [p.id, p]))
  for (const p of l.points) {
    assert.ok(p.x >= PLOT.left && p.x <= PLOT.right, `${p.id} x in the plot`)
    assert.ok(p.y >= PLOT.top && p.y <= PLOT.bottom, `${p.id} y in the plot`)
  }
  // Untimed students sit in their lane, hollow (timed: false), at their real accuracy.
  for (const id of ['untimed-weak', 'untimed-strong']) {
    const p = by.get(id)!
    assert.equal(p.timed, false)
    assert.equal(p.minutesPerMark, null)
    assert.ok(p.x >= UNTIMED_LANE.left && p.x <= UNTIMED_LANE.right, `${id} is in the untimed lane`)
  }
  assert.ok(by.get('untimed-strong')!.y < by.get('untimed-weak')!.y)
  // Timed students are right of the lane, faster further right, around the divider.
  for (const id of ['fast-accurate', 'slow-accurate', 'fast-weak', 'slow-weak']) {
    assert.ok(by.get(id)!.x > UNTIMED_LANE.right, `${id} is in the timed area`)
  }
  assert.ok(by.get('fast-accurate')!.x > l.divider!.x)
  assert.ok(by.get('slow-accurate')!.x < l.divider!.x)
  assert.ok(by.get('fast-weak')!.x > by.get('slow-weak')!.x)
  // Colours come from the analytics quadrant, never re-decided here.
  assert.equal(by.get('fast-accurate')!.quadrant, 'safe')
  assert.equal(by.get('slow-accurate')!.quadrant, 'pacing_risk')
  assert.equal(by.get('fast-weak')!.quadrant, 'careless_risk')
  assert.equal(by.get('slow-weak')!.quadrant, 'under_prepared')
  assert.deepEqual(l.counts, { safe: 2, pacing_risk: 1, careless_risk: 1, under_prepared: 2 })

  // Regions tile the timed area around the divider and the threshold.
  const safe = l.regions.find((r) => r.quadrant === 'safe')!
  assert.equal(safe.x, l.divider!.x)
  assert.equal(Math.round((safe.y + safe.height) * 100) / 100, l.thresholdY)
  const careless = l.regions.find((r) => r.quadrant === 'careless_risk')!
  assert.equal(careless.y, l.thresholdY)

  // Paint order: safe first, the most at-risk last (on top).
  assert.equal(l.points[0].quadrant, 'safe')
  assert.equal(l.points[l.points.length - 1].quadrant, 'under_prepared')

  // Deterministic, and independent of input order.
  const again = layout([...students].reverse())
  assert.deepEqual(again.points, l.points)

  // Table order: most at risk first, weakest first within a zone.
  assert.deepEqual(
    riskTableOrder(l.points).map((p) => p.id),
    ['untimed-weak', 'slow-weak', 'fast-weak', 'slow-accurate', 'fast-accurate', 'untimed-strong']
  )
}

// --- pace mode without anyone untimed: no lane, the timed area is the whole plot ---------

{
  const l = layout(classOf([student('a', 80, 1), student('b', 60, 2), student('c', 50, 3)]))
  assert.equal(l.mode, 'pace')
  assert.equal(l.untimedLane, null)
  assert.equal(l.timedArea.left, PLOT.left)
}

// --- too few timed students: accuracy only, never a made-up pace -------------------------

{
  const students = classOf([student('a', 90, 1.2), student('b', 50, null), student('c', 70, 2.5)])
  const l = layout(students)
  assert.equal(l.mode, 'accuracy_only')
  assert.equal(l.divider, null)
  assert.equal(l.untimedLane, null)
  assert.equal(l.paceRange, null)
  assert.deepEqual(
    l.regions.map((r) => r.quadrant),
    ['safe', 'under_prepared'],
    'without a pace axis only the accuracy split is drawn'
  )
  const by = new Map(l.points.map((p) => [p.id, p]))
  assert.equal(by.get('a')!.timed, true, 'a timed student is still drawn filled')
  assert.equal(by.get('b')!.timed, false, 'and an untimed one hollow')
  for (const p of l.points) assert.ok(p.x >= PLOT.left && p.x <= PLOT.right)
}

{
  const l = layout([])
  assert.equal(l.points.length, 0)
  assert.equal(l.mode, 'accuracy_only')
  assert.deepEqual(l.counts, { safe: 0, pacing_risk: 0, careless_risk: 0, under_prepared: 0 })
}

// --- labels ---------------------------------------------------------------------------------

assert.equal(
  pointLabel({
    name: 'Amira Khan',
    accuracy: 61.6,
    minutesPerMark: 1.44,
    predictedGrade: 'C',
    quadrant: 'pacing_risk',
    attemptCount: 1,
    deficit: { code: '3.9', name: 'Vectors', percentage: 22.2 },
  }),
  'Amira Khan: 62% accuracy, 1.4 min per mark, 1 marked script, predicted C, pacing risk, weakest on Vectors at 22%'
)
assert.equal(
  pointLabel({
    name: 'Ben',
    accuracy: 80,
    minutesPerMark: null,
    predictedGrade: '—',
    quadrant: 'safe',
    attemptCount: 3,
    deficit: null,
  }),
  'Ben: 80% accuracy, untimed, 3 marked scripts, safe zone',
  'no predicted grade on boards without letter grades'
)

console.log('lib/teacher/insights/risk-matrix.test.ts — all assertions passed')
