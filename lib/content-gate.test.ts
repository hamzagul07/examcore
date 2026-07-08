import {
  buildContentReturnPath,
  inferMinimalOnboardingForContentPath,
  isContentGateReturnPath,
  pathnameFromReturnPath,
} from './content-gate'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check(
  'content gate return with query',
  isContentGateReturnPath('/courses/7115/1-1-business-activity?paper=1')
)
check('hub is not content gate return', !isContentGateReturnPath('/courses/7115'))
check(
  'pathname strips query',
  pathnameFromReturnPath('/courses/7115/topic?paper=1') === '/courses/7115/topic'
)
check(
  'build return path keeps query',
  buildContentReturnPath('/courses/7115/topic', 'paper=1') ===
    '/courses/7115/topic?paper=1'
)

const cambridge = inferMinimalOnboardingForContentPath('/courses/7115/1-1-business-activity')
check('infers Cambridge subject from course code', cambridge?.subjects?.[0] === 'Business Studies')
check('Cambridge browse skip uses default board', cambridge?.board === 'Cambridge International')

const ib = inferMinimalOnboardingForContentPath('/ib/courses/maths-aa-hl/1-1')
check('infers IB subject from slug', ib?.subjects?.[0] === 'ib-maths-aa-hl')
check('IB browse skip uses IB board', ib?.board === 'IB')

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}

console.log('content-gate: all checks passed')
