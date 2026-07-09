import { nextReviewInterval, INTERVAL_CAP_DAYS } from './schedule'

let failed = 0
function check(label: string, cond: boolean) {
  if (!cond) {
    failed++
    console.error(`FAIL: ${label}`)
  }
}

// Still failing → back tomorrow, regardless of prior interval.
check('critical resets to 1', nextReviewInterval(4, 'critical', 30) === 1)
check('critical resets to 1 even from cap', nextReviewInterval(INTERVAL_CAP_DAYS, 'critical', 10) === 1)

// Shaky (<60%) → gradual +1, floor 2, cap 4.
check('shaky from 1 → 2', nextReviewInterval(1, 'sampled', 45) === 2)
check('shaky from 3 → 4', nextReviewInterval(3, 'sampled', 55) === 4)
check('shaky caps at 4', nextReviewInterval(6, 'sampled', 50) === 4)

// Stabilising (>=60%) → double, capped.
check('stabilising doubles', nextReviewInterval(2, 'sampled', 70) === 4)
check('stabilising caps at INTERVAL_CAP_DAYS', nextReviewInterval(10, 'sampled', 80) === INTERVAL_CAP_DAYS)

// Guards.
check('zero prior interval treated as 1', nextReviewInterval(0, 'sampled', 70) === 2)

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}
console.log('review/schedule: all checks passed')
