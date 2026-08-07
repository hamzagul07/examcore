import assert from 'node:assert/strict'
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  formatInviteCode,
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
  parseInviteCode,
} from '@/lib/teacher/invite-code'

// --- the wildcard hole this exists to close -----------------------------------

// `/join/%` used to reach the database as an ILIKE pattern, matching every
// classroom and exposing (then joining) whichever one came back.
for (const hostile of ['%', '_', 'a%', '%%', 'ABC%23', "'; drop table", '*']) {
  assert.equal(
    parseInviteCode(hostile),
    null,
    `pattern metacharacters must never reach a query: ${hostile}`
  )
}

assert.equal(parseInviteCode(''), null, 'empty is not a code')
assert.equal(parseInviteCode('   '), null, 'whitespace is not a code')
assert.equal(parseInviteCode(null), null, 'non-strings are rejected')
assert.equal(parseInviteCode(123), null, 'non-strings are rejected')
assert.equal(parseInviteCode('AB'), null, 'too short to be a real code')
assert.equal(parseInviteCode('A'.repeat(64)), null, 'absurd length is rejected')

// --- normalisation matches how people actually type ---------------------------

assert.equal(normalizeInviteCode('  abc123  '), 'ABC123', 'trimmed and uppercased')
assert.equal(normalizeInviteCode('ABC-123'), 'ABC123', 'the display hyphen is optional')
assert.equal(normalizeInviteCode('abc 123'), 'ABC123', 'stray spaces are forgiven')
assert.equal(
  parseInviteCode('a3f9c2e1'),
  'A3F9C2E1',
  'legacy 8-char hex codes still resolve'
)

// --- generation ----------------------------------------------------------------

for (let i = 0; i < 500; i++) {
  const code = generateInviteCode()
  assert.equal(code.length, INVITE_CODE_LENGTH, 'fixed length')
  assert.ok(isValidInviteCode(code), 'generated codes pass their own guard')
  for (const ch of code) {
    assert.ok(
      INVITE_CODE_ALPHABET.includes(ch),
      `generated codes stay inside the alphabet (saw ${ch})`
    )
  }
}

// Characters that are confusable when read aloud or handwritten must never appear.
const generated = Array.from({ length: 300 }, () => generateInviteCode()).join('')
for (const ambiguous of ['O', '0', 'I', '1', 'L']) {
  assert.ok(
    !generated.includes(ambiguous),
    `${ambiguous} is confusable when dictated to a class and must not be generated`
  )
}

// Rejection sampling: bytes at or above the fold point are discarded rather than
// wrapped, so no symbol is over-represented. Feeding only out-of-range bytes on
// the first draw must still terminate with a valid code.
let call = 0
const code = generateInviteCode((n) => {
  call += 1
  // First draw is entirely above the rejection limit; second is usable.
  return new Uint8Array(n).fill(call === 1 ? 255 : 0)
})
assert.equal(code, INVITE_CODE_ALPHABET[0].repeat(INVITE_CODE_LENGTH))
assert.equal(call, 2, 'rejected bytes cause a redraw rather than a biased modulo')

// --- display -------------------------------------------------------------------

assert.equal(formatInviteCode('ABC123'), 'ABC-123', 'grouped for dictation')
assert.equal(
  formatInviteCode('a3f9c2e1'),
  'A3F9C2E1',
  'legacy-length codes are left ungrouped rather than split wrongly'
)

console.log('invite-code.test.ts — all assertions passed')
