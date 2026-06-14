import {
  buildForgotPasswordHref,
  buildResetPasswordCallbackUrl,
  buildSignInHref,
  buildSignUpHref,
  isSafeNextPath,
  postOnboardingHref,
  readPostAuthNextParam,
  resolvePostAuthPath,
  sanitizeNextPath,
} from './auth-redirect'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('rejects open redirect', !isSafeNextPath('//evil.com'))
check('rejects absolute URL', !isSafeNextPath('https://evil.com'))
check('accepts in-app path', isSafeNextPath('/mark'))

check(
  'sanitize falls back',
  sanitizeNextPath('//evil', '/dashboard') === '/dashboard'
)
check(
  'sanitize keeps safe path',
  sanitizeNextPath('/mark?paper=1', '/dashboard') === '/mark?paper=1'
)

check(
  'readPostAuthNextParam prefers next',
  readPostAuthNextParam('/mark', '/dashboard') === '/mark'
)
check(
  'readPostAuthNextParam falls back to redirect',
  readPostAuthNextParam(null, '/dashboard') === '/dashboard'
)

check(
  'new user without next → onboarding',
  resolvePostAuthPath(false, null) === '/onboarding'
)
check(
  'onboarded without next → dashboard',
  resolvePostAuthPath(true, null) === '/dashboard'
)
check(
  'new user with app next → onboarding with next',
  resolvePostAuthPath(false, '/mark') === '/onboarding?next=%2Fmark'
)
check(
  'onboarded with next → destination',
  resolvePostAuthPath(true, '/mark') === '/mark'
)
check(
  'auth-only next bypasses onboarding gate',
  resolvePostAuthPath(false, '/auth/reset-password') === '/auth/reset-password'
)
check(
  'reset page can carry post-reset next in callback path',
  resolvePostAuthPath(
    false,
    '/auth/reset-password?next=/mark'
  ) === '/auth/reset-password?next=/mark'
)

check(
  'sign-in href encodes next',
  buildSignInHref('/mark') === '/auth/signin?next=%2Fmark'
)
check(
  'sign-up href encodes redirect',
  buildSignUpHref('/mark') === '/auth/signup?redirect=%2Fmark'
)
check(
  'forgot-password href encodes next',
  buildForgotPasswordHref('/mark') === '/auth/forgot-password?next=%2Fmark'
)

check(
  'onboarding next does not loop',
  resolvePostAuthPath(false, '/onboarding') === '/onboarding'
)

const resetCallback = buildResetPasswordCallbackUrl(
  'https://markscheme.app',
  '/mark'
)
check(
  'post-onboarding href skips onboarding loop',
  postOnboardingHref('/onboarding', '/mark') === '/mark'
)
check(
  'post-onboarding href keeps mark',
  postOnboardingHref('/mark', '/dashboard') === '/mark'
)
check(
  'reset callback nests return next on reset page',
  resetCallback.includes(
    encodeURIComponent('/auth/reset-password?next=%2Fmark')
  )
)

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}

console.log('auth-redirect: all checks passed')
