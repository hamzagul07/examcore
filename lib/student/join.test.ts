import assert from 'node:assert/strict'
import {
  JOIN_CONSENT_TTL_MS,
  joinDestination,
  joinConsentKey,
  joinFailureMessage,
  joinViewFor,
  recordJoinConsent,
  takeJoinConsent,
  type InvitePreview,
} from '@/lib/student/join'

const preview = (overrides: Partial<InvitePreview> = {}): InvitePreview => ({
  name: '12B Maths',
  description: null,
  subject_label: 'Mathematics · 9709',
  level: 'A-Level',
  teacher_display_name: 'Amira K.',
  student_count: 24,
  membership: 'none',
  own_class: false,
  ...overrides,
})

// --- which card the student sees -------------------------------------------------

assert.equal(joinViewFor(preview(), { autoJoin: false, consentRecorded: false }), 'confirm')
assert.equal(
  joinViewFor(preview(), { autoJoin: true, consentRecorded: false }),
  'confirm',
  'a bare ?auto=1 link never enrols anyone who was not shown the statement'
)
assert.equal(joinViewFor(preview(), { autoJoin: false, consentRecorded: true }), 'confirm', 'consent alone does not auto-join')
assert.equal(joinViewFor(preview(), { autoJoin: true, consentRecorded: true }), 'auto_join')
assert.equal(joinViewFor(preview({ membership: 'left' }), { autoJoin: true, consentRecorded: true }), 'auto_join', 'rejoining after leaving')
assert.equal(joinViewFor(preview({ membership: 'active' }), { autoJoin: true, consentRecorded: true }), 'member')
assert.equal(joinViewFor(preview({ membership: 'removed' }), { autoJoin: true, consentRecorded: true }), 'removed')
assert.equal(joinViewFor(preview({ own_class: true }), { autoJoin: true, consentRecorded: true }), 'own_class')

// --- consent recorded on the signed-out card ---------------------------------------

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

{
  const s = memoryStorage()
  assert.equal(joinConsentKey(' abc123 '), 'ms-join-consent:ABC123')
  recordJoinConsent(s, 'abc123', 1_000)
  assert.equal(takeJoinConsent(s, 'ABC123', 1_000 + JOIN_CONSENT_TTL_MS - 1), true, 'fresh, and case-insensitive')
  assert.equal(takeJoinConsent(s, 'ABC123', 2_000), false, 'consumed: one consent, one join')

  recordJoinConsent(s, 'ABC123', 1_000)
  assert.equal(takeJoinConsent(s, 'ABC123', 1_000 + JOIN_CONSENT_TTL_MS + 1), false, 'stale')
  recordJoinConsent(s, 'ABC123', 1_000)
  assert.equal(takeJoinConsent(s, 'XYZ789', 1_000), false, 'consent is per code')
  s.map.set(joinConsentKey('ABC123'), 'not a number')
  assert.equal(takeJoinConsent(s, 'ABC123', 1_000), false)
  s.map.set(joinConsentKey('ABC123'), String(10 * JOIN_CONSENT_TTL_MS))
  assert.equal(takeJoinConsent(s, 'ABC123', 1_000), false, 'a timestamp from the future is not trusted')

  // Storage that throws (private mode) or is missing never breaks the page.
  const throwing = {
    getItem: () => {
      throw new Error('blocked')
    },
    setItem: () => {
      throw new Error('blocked')
    },
    removeItem: () => {
      throw new Error('blocked')
    },
  }
  recordJoinConsent(throwing, 'ABC123')
  assert.equal(takeJoinConsent(throwing, 'ABC123'), false)
  assert.equal(takeJoinConsent(null, 'ABC123'), false)
  recordJoinConsent(undefined, 'ABC123')
}

// --- failure copy -------------------------------------------------------------------

assert.match(joinFailureMessage(409, { error: 'Removed by teacher' }), /removed you/)
assert.match(joinFailureMessage(404, {}), /does not match/)
assert.match(joinFailureMessage(410, {}), /archived/)
assert.equal(joinFailureMessage(429, { error: 'Too many wrong invite codes' }), 'Too many wrong invite codes')
assert.match(joinFailureMessage(429, null), /tomorrow/)
assert.match(joinFailureMessage(503, {}), /a minute/)
assert.equal(
  joinFailureMessage(400, { error: 'This is your own classroom — share the code with your students.' }),
  'This is your own classroom — share the code with your students.'
)
assert.match(joinFailureMessage(500, { error: 'stack trace here' }), /Could not join/, 'a 5xx body is never shown')
assert.match(joinFailureMessage(401, {}), /Sign in again/)

// --- where the page goes after joining ------------------------------------------------

assert.equal(joinDestination('/dashboard/assignments'), '/dashboard/assignments')
assert.equal(joinDestination('/dashboard'), '/dashboard')
for (const hostile of ['//evil.example', 'https://evil.example', '/dashboard/../admin', '/teacher', '', null, 3]) {
  assert.equal(joinDestination(hostile), '/dashboard', `never navigates to ${String(hostile)}`)
}

console.log('lib/student/join.test.ts — all assertions passed')
