import { requiresGuestSignup } from './auth-gates'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('course hub is public', !requiresGuestSignup('/courses'))
check('course subject hub is public', !requiresGuestSignup('/courses/7115'))
check('course lesson is gated', requiresGuestSignup('/courses/7115/1-1-business-activity'))
check('past-papers hub is public', !requiresGuestSignup('/past-papers/9702'))
check('topics index is public', !requiresGuestSignup('/past-papers/topics'))
check('past-paper topic is gated', requiresGuestSignup('/past-papers/9702/1-1'))
check('ib course hub is public', !requiresGuestSignup('/ib/courses/math-aa-hl'))
check('ib lesson is gated', requiresGuestSignup('/ib/courses/math-aa-hl/1-1'))
check('ib past-paper hub is public', !requiresGuestSignup('/ib/past-papers/biology-hl'))
check('ib past-paper topic is gated', requiresGuestSignup('/ib/past-papers/biology-hl/topic-a'))
check('mark stays public', !requiresGuestSignup('/mark'))

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}

console.log('auth-gates: all checks passed')
