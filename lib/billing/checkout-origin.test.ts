import assert from 'node:assert/strict'
import {
  checkoutAllowedOrigins,
  checkoutOriginAllowed,
} from '@/lib/billing/checkout-origin'

const SITE = 'https://markscheme.app'

// The bug: the success URL came from the Origin header, so a forged or foreign
// origin decided where Polar sent the customer back. Now the header must agree
// with the configured site origin.
assert.equal(checkoutOriginAllowed('https://markscheme.app', SITE, 'production'), true)
assert.equal(checkoutOriginAllowed('https://evil.example', SITE, 'production'), false)
assert.equal(
  checkoutOriginAllowed('http://markscheme.app', SITE, 'production'),
  false,
  'scheme is part of the origin'
)
assert.equal(
  checkoutOriginAllowed('https://markscheme.app.evil.example', SITE, 'production'),
  false,
  'a prefix match is not a match'
)
assert.equal(checkoutOriginAllowed('not a url', SITE, 'production'), false)

// Absent Origin: mobile (bearer auth) and older browsers send none; SameSite
// cookies are the CSRF gate, this is defence in depth.
assert.equal(checkoutOriginAllowed(null, SITE, 'production'), true)
assert.equal(checkoutOriginAllowed(undefined, SITE, 'production'), true)
assert.equal(checkoutOriginAllowed('', SITE, 'production'), true)

// Local dev keeps working against a configured site URL, but only outside
// production.
assert.equal(checkoutOriginAllowed('http://localhost:3000', SITE, 'development'), true)
assert.equal(checkoutOriginAllowed('http://127.0.0.1:3001', SITE, 'test'), true)
assert.equal(checkoutOriginAllowed('http://localhost:3000', SITE, 'production'), false)

// --- The allowlist: previews and alternate hosts ------------------------------
// Only accepting the configured origin refused every Vercel preview (site URL
// set to production, tester on the deployment alias) and any www/apex twin:
// 403 'Bad origin' on the upgrade button. The request's own origin and the
// deployment URLs are legitimate places to post from; evil.example is not.
const previewList = checkoutAllowedOrigins({
  siteUrl: SITE,
  requestOrigin: 'https://markscheme-git-fix-hamza.vercel.app',
  vercelUrl: 'markscheme-abc123.vercel.app',
  vercelBranchUrl: 'markscheme-git-fix-hamza.vercel.app',
})
assert.deepEqual(previewList, [
  'https://markscheme.app',
  'https://markscheme-git-fix-hamza.vercel.app',
  'https://markscheme-abc123.vercel.app',
])
assert.equal(
  checkoutOriginAllowed('https://markscheme-git-fix-hamza.vercel.app', previewList, 'production'),
  true,
  'the branch alias the tester is on'
)
assert.equal(
  checkoutOriginAllowed('https://markscheme-abc123.vercel.app', previewList, 'production'),
  true,
  'the deployment URL'
)
assert.equal(checkoutOriginAllowed('https://markscheme.app', previewList, 'production'), true)
assert.equal(
  checkoutOriginAllowed('https://evil.example', previewList, 'production'),
  false,
  'an origin on no list is still refused'
)
assert.equal(
  checkoutOriginAllowed('https://markscheme-abc123.vercel.app.evil.example', previewList, 'production'),
  false
)
// www vs apex in production: the request arrived on www, so www is allowed.
const wwwList = checkoutAllowedOrigins({ siteUrl: SITE, requestOrigin: 'https://www.markscheme.app' })
assert.equal(checkoutOriginAllowed('https://www.markscheme.app', wwwList, 'production'), true)
assert.equal(checkoutOriginAllowed('https://markscheme.app', wwwList, 'production'), true)
// Missing or malformed env values never break or widen the list.
assert.deepEqual(
  checkoutAllowedOrigins({ siteUrl: SITE, requestOrigin: null, vercelUrl: '', vercelBranchUrl: undefined }),
  [SITE]
)
assert.deepEqual(checkoutAllowedOrigins({ siteUrl: SITE, requestOrigin: 'not a url' }), [SITE])
// Entries compare as origins, so a trailing slash or a path cannot matter.
assert.equal(checkoutOriginAllowed('https://markscheme.app', ['https://markscheme.app/'], 'production'), true)
assert.equal(checkoutOriginAllowed('https://markscheme.app', ['https://markscheme.app/account'], 'production'), true)
// Legacy single-string form still works.
assert.equal(checkoutOriginAllowed('https://markscheme.app', SITE, 'production'), true)

console.log('checkout-origin.test.ts: ok')
