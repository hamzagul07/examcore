import assert from 'node:assert/strict'
import {
  ONE_CLICK_UNSUBSCRIBE_PATH,
  oneClickUrlFromPageHref,
  signUnsubscribeToken,
  unsubscribeColumnPatch,
  unsubscribeLabel,
  unsubscribeUrl,
  verifyUnsubscribeToken,
  type UnsubscribeKind,
} from '@/lib/community/email-unsubscribe'

const KINDS: UnsubscribeKind[] = [
  'replies',
  'digest',
  'threads',
  'review',
  'weekly',
  'streak',
  'activation',
  'updates',
]

const USER = '11111111-2222-3333-4444-555555555555'

// Round trip — the token is the only authentication the one-click endpoint has,
// so every kind must survive sign → verify intact.
for (const kind of KINDS) {
  const parsed = verifyUnsubscribeToken(signUnsubscribeToken(USER, kind))
  assert.deepEqual(parsed, { userId: USER, kind }, `round trip failed for ${kind}`)
}

// Tampering must fail closed. The endpoint writes to a profile row chosen purely
// by the token's user id, so a forgeable token would let anyone mute anyone.
{
  const token = signUnsubscribeToken(USER, 'weekly')
  const decoded = Buffer.from(token, 'base64url').toString('utf8')
  const [, kind, exp, sig] = decoded.split('.')

  const otherUser = Buffer.from(`victim-user-id.${kind}.${exp}.${sig}`, 'utf8').toString('base64url')
  assert.equal(verifyUnsubscribeToken(otherUser), null, 'swapped user id must be rejected')

  const otherKind = Buffer.from(`${USER}.streak.${exp}.${sig}`, 'utf8').toString('base64url')
  assert.equal(verifyUnsubscribeToken(otherKind), null, 'swapped kind must be rejected')

  const extended = Buffer.from(
    `${USER}.${kind}.${Number(exp) + 86_400_000}.${sig}`,
    'utf8'
  ).toString('base64url')
  assert.equal(verifyUnsubscribeToken(extended), null, 'extended expiry must be rejected')
}

// Already-expired tokens are refused even with a valid signature.
{
  const expired = verifyUnsubscribeToken(
    Buffer.from(`${USER}.weekly.${Date.now() - 1000}.whatever`, 'utf8').toString('base64url')
  )
  assert.equal(expired, null, 'expired token must be rejected')
}

for (const junk of ['', 'not-a-token', 'a.b.c', Buffer.from('x.y.z.w').toString('base64url')]) {
  assert.equal(verifyUnsubscribeToken(junk), null, `junk token accepted: ${junk}`)
}

// The header URL is derived from the body link, so the rewrite must keep the
// token intact and land on the POST endpoint rather than the human page.
for (const kind of KINDS) {
  const pageHref = unsubscribeUrl(USER, kind)
  const oneClick = oneClickUrlFromPageHref(pageHref)
  assert.ok(oneClick, `no one-click URL derived for ${kind}`)
  assert.ok(
    oneClick.includes(ONE_CLICK_UNSUBSCRIBE_PATH),
    `one-click URL does not point at the endpoint for ${kind}`
  )

  const token = new URL(oneClick).searchParams.get('token') ?? ''
  assert.deepEqual(
    verifyUnsubscribeToken(token),
    { userId: USER, kind },
    `token lost in rewrite for ${kind}`
  )
}

assert.equal(oneClickUrlFromPageHref('not a url'), null)
assert.equal(oneClickUrlFromPageHref('https://markscheme.app/community/unsubscribe'), null)

// Each kind switches off exactly one column, and no two kinds share one —
// otherwise unsubscribing from streaks would silently kill the weekly report.
{
  const seen = new Map<string, UnsubscribeKind>()
  for (const kind of KINDS) {
    const patch = unsubscribeColumnPatch(kind)
    const cols = Object.keys(patch)
    assert.equal(cols.length, 1, `${kind} patches ${cols.length} columns`)
    assert.equal(patch[cols[0]], false, `${kind} must set its column false`)

    const clash = seen.get(cols[0])
    assert.equal(clash, undefined, `${kind} and ${clash} both write ${cols[0]}`)
    seen.set(cols[0], kind)

    assert.ok(unsubscribeLabel(kind).length > 0, `${kind} has no label`)
  }
}

console.log('email-unsubscribe tests passed')
