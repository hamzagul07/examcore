import assert from 'node:assert/strict'
import {
  EMAIL_CHUNK_SIZE,
  mapLimited,
  selectRecipients,
  type RecipientAccount,
  type RecipientProfile,
} from '@/lib/teacher/email/recipients'

/**
 * Consent is decided in one pure function so the three senders (publish,
 * reminders, digest) cannot drift: preference on, address confirmed, not
 * suppressed, each person once.
 */

const profiles = new Map<string, RecipientProfile>([
  ['on', { full_name: 'Amira Khan', opted_in: true }],
  ['default', { full_name: 'Ben Okafor', opted_in: null }],
  ['missing-col', { full_name: 'Cara Lee', opted_in: undefined }],
  ['off', { full_name: 'Dev Patel', opted_in: false }],
  ['unconfirmed', { full_name: 'Eli Stone', opted_in: true }],
  ['bounced', { full_name: 'Fay Wong', opted_in: true }],
  ['no-email', { full_name: 'Gus Ray', opted_in: true }],
])
const accounts = new Map<string, RecipientAccount>([
  ['on', { email: 'amira@example.com', confirmed: true }],
  ['default', { email: ' ben@example.com ', confirmed: true }],
  ['missing-col', { email: 'cara@example.com', confirmed: true }],
  ['off', { email: 'dev@example.com', confirmed: true }],
  ['unconfirmed', { email: 'eli@example.com', confirmed: false }],
  ['bounced', { email: 'Fay@Example.com', confirmed: true }],
  ['no-email', { email: null, confirmed: true }],
])
// Suppressions are stored lower-cased by the Resend webhook.
const suppressed = new Set(['fay@example.com'])

const picked = selectRecipients({
  userIds: ['on', 'default', 'missing-col', 'off', 'unconfirmed', 'bounced', 'no-email', 'no-profile', 'on'],
  profiles,
  accounts,
  suppressed,
})

assert.deepEqual(
  picked.map((r) => r.userId),
  ['on', 'default', 'missing-col'],
  'opted out, unconfirmed, suppressed (case-insensitively), address-less and profile-less accounts are never mailed; nobody twice'
)
assert.equal(picked[1].email, 'ben@example.com', 'addresses are trimmed')
assert.equal(picked[0].fullName, 'Amira Khan', 'the raw name travels on, for displayName() in the email')

assert.deepEqual(
  selectRecipients({ userIds: [], profiles, accounts, suppressed }),
  [],
  'nobody in, nobody out'
)

// The spec's batch size for sends after the response.
assert.equal(EMAIL_CHUNK_SIZE, 50)

async function limited(): Promise<void> {
  let inFlight = 0
  let peak = 0
  const out = await mapLimited([5, 1, 4, 2, 3], 2, async (n) => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await new Promise((r) => setTimeout(r, n))
    inFlight -= 1
    return n * 10
  })
  assert.deepEqual(out, [50, 10, 40, 20, 30], 'results keep input order')
  assert.ok(peak <= 2, `at most two account lookups in flight (saw ${peak})`)
  assert.deepEqual(await mapLimited([], 4, async () => 1), [])
}

limited()
  .then(() => console.log('recipients.test.ts — all assertions passed'))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
