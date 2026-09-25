import assert from 'node:assert/strict'
import { MAX_MENTIONS_PER_BODY, extractMentionUsernames } from './mention-extract'

assert.equal(MAX_MENTIONS_PER_BODY, 5)

assert.deepEqual(extractMentionUsernames(''), [])
assert.deepEqual(extractMentionUsernames('no mentions here'), [])
assert.deepEqual(extractMentionUsernames('hi @alice'), ['alice'])
assert.deepEqual(extractMentionUsernames('hi u/Bob and @alice'), ['bob', 'alice'], 'order of appearance, lower-cased')
assert.deepEqual(extractMentionUsernames('@alice @Alice u/ALICE'), ['alice'], 'same user counted once')
assert.deepEqual(extractMentionUsernames('email me@example.com'), [], 'inside a word is not a mention')
assert.deepEqual(extractMentionUsernames('(@alice, @bob)'), ['alice', 'bob'], 'punctuation lead-ins')
assert.deepEqual(extractMentionUsernames('@ab'), [], 'below the 3-char username minimum')

// The cap: a comment naming everyone on the leaderboard notifies five people,
// not fifty, and the five are the ones typed first.
{
  const names = Array.from({ length: 50 }, (_, i) => `user${String(i).padStart(2, '0')}`)
  const body = names.map((n) => `@${n}`).join(' ')
  const out = extractMentionUsernames(body)
  assert.equal(out.length, MAX_MENTIONS_PER_BODY, 'capped at MAX_MENTIONS_PER_BODY')
  assert.deepEqual(out, names.slice(0, 5), 'the first five in the text win')
}

// Mixed syntaxes still respect order of first appearance under the cap.
{
  const out = extractMentionUsernames('u/one @two u/three @four u/five @six @seven')
  assert.deepEqual(out, ['one', 'two', 'three', 'four', 'five'])
}

// A duplicate near the top does not eat a slot from a later distinct name.
{
  const out = extractMentionUsernames('@a11 @a11 @b22 @c33 @d44 @e55 @f66')
  assert.deepEqual(out, ['a11', 'b22', 'c33', 'd44', 'e55'])
}

// Explicit max is honoured, including zero.
assert.deepEqual(extractMentionUsernames('@aaa @bbb @ccc', 2), ['aaa', 'bbb'])
assert.deepEqual(extractMentionUsernames('@aaa @bbb', 0), [])

console.log('mention-extract tests passed')
