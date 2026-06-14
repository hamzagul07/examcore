import { isOnboardingComplete } from '@/lib/onboarding'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check(
  'onboarded flag satisfies profile check',
  isOnboardingComplete({ onboarded: true, onboarding_completed: false })
)
check(
  'onboarding_completed flag satisfies profile check',
  isOnboardingComplete({ onboarded: false, onboarding_completed: true })
)
check('null profile is not onboarded', !isOnboardingComplete(null))
check(
  'incomplete profile is not onboarded',
  !isOnboardingComplete({ onboarded: false, onboarding_completed: false })
)

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}

console.log('restore-session: all checks passed')
