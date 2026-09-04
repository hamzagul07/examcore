import assert from 'node:assert/strict'
import { createHmac } from 'crypto'
import {
  verifyResendSignature,
  suppressionFromEvent,
  WEBHOOK_TOLERANCE_SECONDS,
} from './resend-webhook'

const SECRET = 'whsec_' + Buffer.from('a-test-signing-key-32-bytes-long!').toString('base64')
const BODY = JSON.stringify({ type: 'email.bounced', data: { to: ['x@example.com'] } })
const ID = 'msg_2abc'
const NOW = 1_772_000_000

function sign(body: string, id: string, ts: number, secret = SECRET): string {
  const key = Buffer.from(secret.slice(6), 'base64')
  return 'v1,' + createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64')
}

// ── A genuine signature passes ──────────────────────────────────────────────
assert.equal(
  verifyResendSignature({
    body: BODY, id: ID, timestamp: String(NOW),
    signature: sign(BODY, ID, NOW), secret: SECRET, nowSeconds: NOW,
  }),
  true
)

// ── Everything that must not pass ───────────────────────────────────────────
const good = {
  body: BODY, id: ID, timestamp: String(NOW),
  signature: sign(BODY, ID, NOW), secret: SECRET, nowSeconds: NOW,
}

assert.equal(verifyResendSignature({ ...good, body: BODY + ' ' }), false, 'tampered body')
assert.equal(verifyResendSignature({ ...good, id: 'msg_other' }), false, 'tampered id')
assert.equal(
  verifyResendSignature({ ...good, signature: sign(BODY, ID, NOW, 'whsec_' + Buffer.from('different-key-entirely-32-bytes!!').toString('base64')) }),
  false,
  'signed with another secret'
)
for (const missing of ['id', 'timestamp', 'signature'] as const) {
  assert.equal(verifyResendSignature({ ...good, [missing]: null }), false, `missing ${missing}`)
}
assert.equal(verifyResendSignature({ ...good, secret: '' }), false, 'no secret configured')
assert.equal(verifyResendSignature({ ...good, timestamp: 'not-a-number' }), false)
assert.equal(verifyResendSignature({ ...good, signature: 'garbage' }), false)
assert.equal(verifyResendSignature({ ...good, signature: 'v2,' + sign(BODY, ID, NOW).slice(3) }), false, 'unknown version')

// A captured request must not be replayable tomorrow.
assert.equal(
  verifyResendSignature({ ...good, nowSeconds: NOW + WEBHOOK_TOLERANCE_SECONDS + 1 }),
  false,
  'outside the tolerance window'
)
assert.equal(
  verifyResendSignature({ ...good, nowSeconds: NOW + WEBHOOK_TOLERANCE_SECONDS - 1 }),
  true,
  'inside it'
)
// Clock skew cuts both ways.
assert.equal(verifyResendSignature({ ...good, nowSeconds: NOW - 60 }), true)

// Rotation: two space-separated signatures, only the second current.
assert.equal(
  verifyResendSignature({ ...good, signature: `v1,AAAA ${sign(BODY, ID, NOW)}` }),
  true,
  'either signature in a rotation is valid'
)

// ── Which events stop us mailing someone ────────────────────────────────────
assert.deepEqual(
  suppressionFromEvent('email.complained', { to: ['A@Example.com '] }),
  { email: 'a@example.com', reason: 'complained', detail: null },
  'a complaint is absolute, and the address is normalised'
)

assert.deepEqual(
  suppressionFromEvent('email.bounced', {
    to: ['gone@example.com'],
    bounce: { type: 'Hard', message: 'No such recipient' },
  }),
  { email: 'gone@example.com', reason: 'bounced', detail: 'No such recipient' }
)

// A soft bounce is a full mailbox or a greylisting server. Suppressing on it
// would quietly delete live students from every future audience.
for (const kind of ['Soft', 'Undetermined', '']) {
  assert.equal(
    suppressionFromEvent('email.bounced', { to: ['x@example.com'], bounce: { type: kind } }),
    null,
    `${kind || 'missing'} bounce must not suppress`
  )
}

// Everything else is telemetry, not a reason to stop.
for (const t of ['email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.delivery_delayed']) {
  assert.equal(suppressionFromEvent(t, { to: ['x@example.com'] }), null, t)
}

assert.equal(suppressionFromEvent('email.complained', { to: [] }), null, 'no address')
assert.equal(suppressionFromEvent('email.complained', null), null)

console.log('resend-webhook: all assertions passed')
