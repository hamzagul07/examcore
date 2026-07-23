import assert from 'node:assert/strict'
import { buildGradeTarget, RECENT_WINDOW } from '@/lib/dashboard/grade-target'

const NOW = new Date('2026-07-22T09:00:00Z')

function a(pct: number, daysAgo: number) {
  const d = new Date(NOW)
  d.setUTCDate(d.getUTCDate() - daysAgo)
  return {
    marks_earned: pct,
    total_marks: 100,
    created_at: d.toISOString(),
  }
}

function main() {
  // No usable marks → nothing to plot. A track with no marker on it is worse
  // than no track.
  assert.equal(
    buildGradeTarget({ attempts: [], targetGrade: 'A', examDate: null, now: NOW }),
    null
  )
  assert.equal(
    buildGradeTarget({
      attempts: [{ marks_earned: 5, total_marks: 0, created_at: NOW.toISOString() }],
      targetGrade: 'A',
      examDate: null,
      now: NOW,
    }),
    null,
    'total_marks = 0 cannot yield a percentage'
  )

  const g = buildGradeTarget({
    attempts: [a(64, 1), a(66, 2), a(62, 3)],
    targetGrade: 'A',
    examDate: '2026-09-01',
    now: NOW,
  })!
  assert.equal(g.averagePct, 64)
  assert.equal(g.currentGrade, 'B') // B boundary is 60
  assert.equal(g.targetPct, 70) // A boundary
  assert.equal(g.pointsToGo, 6)
  assert.equal(g.onTrack, false)
  assert.equal(g.sampleSize, 3)
  assert.equal(g.daysToExam, 41)

  // Already at or past the target: no negative gap, and onTrack flips.
  const ahead = buildGradeTarget({
    attempts: [a(88, 1)],
    targetGrade: 'A',
    examDate: null,
    now: NOW,
  })!
  assert.equal(ahead.onTrack, true)
  assert.equal(ahead.pointsToGo, 0)
  assert.equal(ahead.currentGrade, 'A*')

  // Recent form only — older marks must not drag a improving student down.
  const many = Array.from({ length: 20 }, (_, i) => a(i < 10 ? 85 : 30, i))
  const recent = buildGradeTarget({
    attempts: many,
    targetGrade: 'A',
    examDate: null,
    now: NOW,
  })!
  assert.equal(recent.sampleSize, RECENT_WINDOW)
  assert.equal(recent.averagePct, 85, 'only the newest 10 count')

  // IB numeric target has no Cambridge percentage boundary — we must not
  // invent one, or the gap becomes false precision.
  const ib = buildGradeTarget({
    attempts: [a(64, 1)],
    targetGrade: '7',
    examDate: null,
    now: NOW,
  })!
  assert.equal(ib.targetGrade, '7')
  assert.equal(ib.targetPct, null)
  assert.equal(ib.pointsToGo, null)

  // IB students have no Cambridge A*–E boundary, so this whole track (which is
  // Cambridge grades and bands) must not render for them — even with plenty of
  // scored attempts. Otherwise an IB student is told they're "a B".
  assert.equal(
    buildGradeTarget({
      attempts: [a(72, 1), a(70, 2), a(74, 3)],
      targetGrade: '6',
      examDate: '2026-09-01',
      isIb: true,
      now: NOW,
    }),
    null,
    'IB gets no Cambridge grade track'
  )

  // No target set: still a valid position, just nothing to aim at yet.
  const noTarget = buildGradeTarget({
    attempts: [a(64, 1)],
    targetGrade: null,
    examDate: null,
    now: NOW,
  })!
  assert.equal(noTarget.targetGrade, null)
  assert.equal(noTarget.pointsToGo, null)

  // A past exam date is stale profile data, not a negative countdown.
  const past = buildGradeTarget({
    attempts: [a(64, 1)],
    targetGrade: 'A',
    examDate: '2020-01-01',
    now: NOW,
  })!
  assert.equal(past.daysToExam, null)

  const badDate = buildGradeTarget({
    attempts: [a(64, 1)],
    targetGrade: 'A',
    examDate: 'not-a-date',
    now: NOW,
  })!
  assert.equal(badDate.daysToExam, null)

  console.log('grade-target.test.ts: ok')
}

main()
