import {
  createOnboardingSaveToken,
  verifyOnboardingSaveToken,
} from './save-token'

process.env.ONBOARDING_SAVE_SECRET = 'test-onboarding-save-secret'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const userId = '11111111-1111-1111-1111-111111111111'
const token = createOnboardingSaveToken(userId)
const verified = verifyOnboardingSaveToken(token)

check('valid token verifies', verified?.userId === userId)
check('garbage token rejected', verifyOnboardingSaveToken('bad.token') === null)
check('empty token rejected', verifyOnboardingSaveToken('') === null)

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}

console.log('save-token: all checks passed')
