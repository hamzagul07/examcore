import {
  buildForgotPasswordHref,
  buildResetPasswordCallbackUrl,
  buildSignInHref,
  buildSignUpHref,
  buildContentGateSignUpHref,
  isSafeNextPath,
  postOnboardingHref,
  readPostAuthNextParam,
  resolvePostAuthPath,
  resolveSameOriginPath,
  resolveSameOriginUrl,
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
check('rejects marketing homepage as next', !isSafeNextPath('/'))
check(
  'sanitize homepage → dashboard',
  sanitizeNextPath('/', '/dashboard') === '/dashboard'
)
check(
  'onboarded with homepage next → dashboard',
  resolvePostAuthPath(true, '/') === '/dashboard'
)

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
  'content gate signup href encodes redirect and from',
  buildContentGateSignUpHref('/courses/7115/topic?paper=1') ===
    '/auth/signup?from=content&redirect=%2Fcourses%2F7115%2Ftopic%3Fpaper%3D1'
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

// --- Open redirect via backslash / control characters (review §1.1) ---------
// `new URL('/\\evil.com', origin).href === 'https://evil.com/'`: the URL parser
// treats a backslash as a slash for http(s), so a "relative" path that only
// rejects `//` and `://` still walks off-site.
const ORIGIN = 'https://markscheme.app'

check('rejects backslash open redirect', !isSafeNextPath('/\\evil.com'))
check(
  'sanitize rejects backslash open redirect',
  sanitizeNextPath('/\\evil.com', '/dashboard') === '/dashboard'
)
check(
  'rejects percent-encoded backslash after decoding',
  !isSafeNextPath(decodeURIComponent('/%5Cevil.com'))
)
check(
  'rejects percent-encoded backslash even before decoding',
  !isSafeNextPath('/%5Cevil.com')
)
check('rejects slash-backslash-slash form', !isSafeNextPath('/\\/evil.com'))
check('rejects tab in path', !isSafeNextPath('/\tevil.com'))
check('rejects embedded newline in path', !isSafeNextPath('/ma\nrk'))
check('rejects null byte in path', !isSafeNextPath('/mark\u0000'))
check('still rejects protocol-relative', !isSafeNextPath('//evil.com'))
check('still rejects absolute URL', !isSafeNextPath('https://evil.com'))
check(
  'allows path with query and hash',
  isSafeNextPath('/dashboard?x=1#h') &&
    sanitizeNextPath('/dashboard?x=1#h', '/mark') === '/dashboard?x=1#h'
)
check('allows plain in-app path', isSafeNextPath('/mark'))

// resolveSameOriginPath — the sink-side guard.
check(
  'resolve keeps same-origin path with query and hash',
  resolveSameOriginPath('/dashboard?x=1#h', ORIGIN) === '/dashboard?x=1#h'
)
check('resolve keeps plain path', resolveSameOriginPath('/mark', ORIGIN) === '/mark')
check(
  'resolve rejects backslash escape',
  resolveSameOriginPath('/\\evil.com', ORIGIN) === null
)
check(
  'resolve rejects encoded backslash',
  resolveSameOriginPath('/%5Cevil.com', ORIGIN) === null
)
check(
  'resolve rejects protocol-relative',
  resolveSameOriginPath('//evil.com', ORIGIN) === null
)
check(
  'resolve rejects slash-backslash-slash',
  resolveSameOriginPath('/\\/evil.com', ORIGIN) === null
)
check(
  'resolve rejects other-origin absolute URL',
  resolveSameOriginPath('https://evil.com', ORIGIN) === null
)
check(
  'resolve rejects other scheme',
  resolveSameOriginPath('javascript:alert(1)', ORIGIN) === null
)
check(
  'resolve collapses same-origin absolute URL to its path',
  resolveSameOriginPath('https://markscheme.app/mark?paper=1', ORIGIN) ===
    '/mark?paper=1'
)
check(
  'resolve rejects same host on a different scheme',
  resolveSameOriginPath('http://markscheme.app/mark', ORIGIN) === null
)
check('resolve rejects empty', resolveSameOriginPath('', ORIGIN) === null)
check('resolve rejects null', resolveSameOriginPath(null, ORIGIN) === null)
check(
  'resolve rejects control characters',
  resolveSameOriginPath('/mark\r\nSet-Cookie: a=b', ORIGIN) === null
)
check(
  'resolve tolerates an origin given with a path',
  resolveSameOriginPath('/mark', 'https://markscheme.app/auth/signin') === '/mark'
)

// The higher-level helpers all funnel through the same check.
check(
  'readPostAuthNextParam drops backslash next',
  readPostAuthNextParam('/\\evil.com', null) === null
)
check(
  'postOnboardingHref drops backslash next',
  postOnboardingHref('/\\evil.com', '/mark') === '/mark'
)
check(
  'resolvePostAuthPath drops backslash next',
  resolvePostAuthPath(true, '/\\evil.com') === '/dashboard'
)

// --- Dot-segment normalisation to protocol-relative (review §1.1, reopened) --
// The WHATWG parser collapses `..` and `.` segments BEFORE the origin is
// compared, so each of these resolves same-origin with pathname `//evil.com`.
// Returned as a path and re-resolved by a sink, `//evil.com` is an off-site
// redirect: new URL('//evil.com', 'https://markscheme.app/auth/signin').href
// === 'https://evil.com/'.
const DOT_SEGMENT_PAYLOADS = [
  '/..//evil.com',
  '/a/..//evil.com',
  '/.//evil.com',
  '/%2e%2e//evil.com',
  '/%2E%2E//evil.com',
  '/a/b/../..//evil.com',
  '/..//evil.com/path?x=1#h',
]
for (const payload of DOT_SEGMENT_PAYLOADS) {
  check(`isSafeNextPath rejects ${payload}`, !isSafeNextPath(payload))
  check(
    `sanitizeNextPath rejects ${payload}`,
    sanitizeNextPath(payload, '/dashboard') === '/dashboard'
  )
  check(
    `readPostAuthNextParam rejects ${payload} as next`,
    readPostAuthNextParam(payload, null) === null
  )
  check(
    `readPostAuthNextParam rejects ${payload} as redirect`,
    readPostAuthNextParam(null, payload) === null
  )
  check(
    `postOnboardingHref rejects ${payload}`,
    postOnboardingHref(payload, '/mark') === '/mark'
  )
  check(
    `resolvePostAuthPath rejects ${payload}`,
    resolvePostAuthPath(true, payload) === '/dashboard' &&
      resolvePostAuthPath(false, payload) === '/onboarding'
  )
  check(
    `resolveSameOriginPath rejects ${payload}`,
    resolveSameOriginPath(payload, ORIGIN) === null
  )
  check(
    `resolveSameOriginUrl rejects ${payload}`,
    resolveSameOriginUrl(payload, ORIGIN) === null
  )
}

// Sink-level guarantee: whatever resolveSameOriginPath returns, resolving it
// again at a sink stays on the site origin — for every input tried above and
// for ordinary in-app paths. This is the property the sinks rely on.
for (const input of [
  ...DOT_SEGMENT_PAYLOADS,
  '/\\evil.com',
  '//evil.com',
  'https://evil.com',
  '/mark',
  '/dashboard?x=1#h',
  '/a/../mark',
  '/a/./b',
  '/foo//bar',
  'https://markscheme.app/mark?paper=1',
]) {
  const out = resolveSameOriginPath(input, ORIGIN)
  check(
    `sink re-resolution of ${JSON.stringify(input)} stays same-origin`,
    out === null || new URL(out, `${ORIGIN}/auth/signin`).origin === ORIGIN
  )
  const url = resolveSameOriginUrl(input, ORIGIN)
  check(
    `resolveSameOriginUrl for ${JSON.stringify(input)} is same-origin or null`,
    url === null || url.origin === ORIGIN
  )
  check(
    `path and url forms agree for ${JSON.stringify(input)}`,
    (out === null) === (url === null) &&
      (url === null || `${url.pathname}${url.search}${url.hash}` === out)
  )
}

// Legitimate dot segments that stay on-site are collapsed, not refused.
check(
  'resolve collapses an in-app dot segment',
  resolveSameOriginPath('/a/../mark', ORIGIN) === '/mark'
)
check(
  'resolve keeps a double slash INSIDE a path (not at the start)',
  resolveSameOriginPath('/foo//bar', ORIGIN) === '/foo//bar'
)
check(
  'resolveSameOriginUrl builds the absolute URL on the checked origin',
  resolveSameOriginUrl('/mark?paper=1', 'https://markscheme.app/auth/signin')
    ?.href === 'https://markscheme.app/mark?paper=1'
)
check('resolveSameOriginUrl rejects null', resolveSameOriginUrl(null, ORIGIN) === null)

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
}

console.log('auth-redirect: all checks passed')
