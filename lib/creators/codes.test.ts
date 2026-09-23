import assert from 'node:assert/strict'
import {
  buildShareKit,
  creatorRefFromRequest,
  nextMilestone,
  normalizeCreatorCode,
  parseCreatorRef,
  reachedMilestones,
  serializeCreatorRef,
  validateCreatorCode,
} from '@/lib/creators/codes'

// --- codes are what gets said out loud ----------------------------------------

assert.equal(normalizeCreatorCode(' maya '), 'MAYA', 'case and whitespace are not part of a code')
assert.equal(normalizeCreatorCode('ma-ya!'), 'MAYA', 'punctuation is stripped, not rejected')
assert.equal(normalizeCreatorCode(42), '', 'non-strings normalise to nothing')

assert.deepEqual(validateCreatorCode('maya'), { ok: true, code: 'MAYA' })
assert.deepEqual(validateCreatorCode(''), { ok: false, reason: 'empty' })
assert.deepEqual(validateCreatorCode('ab'), { ok: false, reason: 'too_short' })
assert.equal(
  validateCreatorCode('abcdefghijklmnop').ok,
  true,
  'over-long input is truncated to the 12-char limit rather than failing'
)

// --- the cookie carries either a code or a handle ------------------------------

assert.deepEqual(parseCreatorRef('code:maya'), { kind: 'code', value: 'MAYA' })
assert.deepEqual(parseCreatorRef('handle:Maya_01'), { kind: 'handle', value: 'maya_01' })
assert.equal(parseCreatorRef('handle:not a handle'), null)
assert.equal(parseCreatorRef('code:'), null)
assert.equal(parseCreatorRef('other:x'), null)
assert.equal(parseCreatorRef(undefined), null)
assert.equal(serializeCreatorRef({ kind: 'code', value: 'MAYA' }), 'code:MAYA')

// --- the proxy reads refs without a database -----------------------------------

assert.deepEqual(
  creatorRefFromRequest('/with/maya', new URLSearchParams()),
  { kind: 'handle', value: 'maya' },
  'a landing on the creator space is a ref'
)
assert.deepEqual(
  creatorRefFromRequest('/with/%40Maya/', new URLSearchParams()),
  { kind: 'handle', value: 'maya' },
  'an encoded @ and a trailing slash are tolerated'
)
assert.deepEqual(
  creatorRefFromRequest('/mark', new URLSearchParams('code=maya')),
  { kind: 'code', value: 'MAYA' },
  'a ?code= on any path is a ref'
)
assert.deepEqual(
  creatorRefFromRequest('/with/maya', new URLSearchParams('code=ZED')),
  { kind: 'code', value: 'ZED' },
  'an explicit code beats the path'
)
assert.equal(creatorRefFromRequest('/with', new URLSearchParams()), null)
assert.equal(creatorRefFromRequest('/with/maya/extra', new URLSearchParams()), null)
assert.equal(creatorRefFromRequest('/mark', new URLSearchParams('code=!')), null)
assert.equal(creatorRefFromRequest('/with/%E0%A4%A', new URLSearchParams()), null, 'bad escapes are not a crash')

// --- milestones ------------------------------------------------------------------

assert.deepEqual(reachedMilestones(0), [])
assert.equal(reachedMilestones(120).length, 2)
const next0 = nextMilestone(0)
assert.ok(next0 && next0.at === 50 && next0.remaining === 50 && next0.progress === 0)
const next75 = nextMilestone(75)
assert.ok(next75 && next75.at === 100 && next75.remaining === 25)
assert.equal(next75.progress, 0.5, 'progress is measured from the previous milestone')
assert.equal(nextMilestone(500), null, 'the ladder ends')

// --- the share kit ships its own disclosure -------------------------------------

const kit = buildShareKit({
  handle: 'maya',
  code: 'MAYA',
  giftMarks: 5,
  siteUrl: 'https://markscheme.app/',
})
assert.equal(kit.link, 'https://markscheme.app/with/maya')
assert.equal(kit.markLink, 'https://markscheme.app/mark?code=MAYA')
assert.ok(kit.bioLine.includes('MAYA') && kit.bioLine.includes('markscheme.app/with/maya'))
for (const text of [kit.pinnedComment, kit.caption]) {
  assert.ok(text.includes('#ad'), 'every post text carries the ad label')
  assert.ok(text.includes('MAYA'))
}
const noGift = buildShareKit({ handle: 'm', code: 'M01', giftMarks: 0, siteUrl: 'https://x.test' })
assert.ok(!/0 free marks/.test(noGift.bioLine), 'a zero gift is not advertised as a number')

console.log('creators/codes: ok')
