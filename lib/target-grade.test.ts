import assert from 'node:assert/strict'
import {
  targetGradeOptions,
  isValidTargetGrade,
  gapToTargetGrade,
  CAMBRIDGE_TARGET_GRADES,
  IB_TARGET_GRADES,
} from '@/lib/target-grade'

function main() {
  // The two boards use disjoint scales. Onboarding validates against the
  // student's own board before storing, because a Cambridge grade saved on an
  // IB profile does not error — it silently produces no gap forever, since
  // gapToTargetGrade looks the grade up in GRADE_BOUNDARIES and misses.
  assert.deepEqual(targetGradeOptions(false), [...CAMBRIDGE_TARGET_GRADES])
  assert.deepEqual(targetGradeOptions(true), [...IB_TARGET_GRADES])

  assert.equal(isValidTargetGrade(false, 'A*'), true)
  assert.equal(isValidTargetGrade(true, 'A*'), false, 'IB has no A*')
  assert.equal(isValidTargetGrade(true, '7'), true)
  assert.equal(isValidTargetGrade(false, '7'), false, 'Cambridge has no grade 7')
  assert.equal(isValidTargetGrade(false, ''), false)
  assert.equal(isValidTargetGrade(false, 'a*'), false, 'case-sensitive by design')

  // Every option the picker offers must be storable — if these ever drift, the
  // student picks a chip and the server drops it without saying so.
  for (const g of targetGradeOptions(false)) {
    assert.equal(isValidTargetGrade(false, g), true, `Cambridge option ${g} rejected`)
  }
  for (const g of targetGradeOptions(true)) {
    assert.equal(isValidTargetGrade(true, g), true, `IB option ${g} rejected`)
  }

  // Gap arithmetic. A = 70%.
  assert.deepEqual(gapToTargetGrade(50, 'A'), { onTrack: false, pointsToGo: 20 })
  assert.deepEqual(gapToTargetGrade(70, 'A'), { onTrack: true, pointsToGo: 0 })
  assert.deepEqual(gapToTargetGrade(85, 'A'), { onTrack: true, pointsToGo: 0 })
  // Rounds up: 0.5 of a point still needs finding.
  assert.deepEqual(gapToTargetGrade(69.5, 'A'), { onTrack: false, pointsToGo: 1 })

  // No target, no average, or an IB grade → no gap rather than a fabricated one.
  assert.equal(gapToTargetGrade(50, null), null)
  assert.equal(gapToTargetGrade(null, 'A'), null)
  assert.equal(gapToTargetGrade(50, '7'), null, 'IB grades have no Cambridge boundary')

  console.log('target-grade tests passed')
}

main()
