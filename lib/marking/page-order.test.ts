import assert from 'node:assert/strict'
import {
  MIN_PAGE_CHARS_FOR_ORDERING,
  applyPageOrder,
  buildPageOrderPrompt,
  describePageOrder,
  isUploadOrder,
  pageExcerpt,
  parsePageOrder,
  shouldCheckPageOrder,
} from '@/lib/marking/page-order'

// --- parsing: the only thing standing between a model and a student's work ----
//
// Every rejection here is a page that would otherwise have been deleted or
// duplicated from somebody's answer, so the bar is "exactly a permutation".

assert.deepEqual(parsePageOrder('[2,1]', 2), [2, 1])
assert.deepEqual(parsePageOrder('[1,2,3]', 3), [1, 2, 3])
assert.deepEqual(parsePageOrder('  [3, 1, 2]  ', 3), [3, 1, 2])
assert.deepEqual(parsePageOrder('```json\n[2,1]\n```', 2), [2, 1], 'code fence tolerated')
assert.deepEqual(
  parsePageOrder('The reading order is [2,1] based on continuity.', 2),
  [2, 1],
  'prose around the array tolerated'
)
assert.deepEqual(parsePageOrder('["2","1"]', 2), [2, 1], 'numeric strings coerced')

for (const [raw, count, why] of [
  ['[1,1]', 2, 'a repeat would duplicate a page'],
  ['[1]', 2, 'a short array would drop a page'],
  ['[1,2,3]', 2, 'a long array invents a page'],
  ['[0,1]', 2, 'zero is not a page number'],
  ['[1,3]', 2, 'out of range invents a page'],
  ['[1,2.5]', 2, 'a non-integer is not a page number'],
  ['[]', 2, 'empty'],
  ['not json at all', 2, 'no array'],
  ['[1,2', 2, 'unterminated'],
  ['', 2, 'empty response'],
] as const) {
  assert.equal(parsePageOrder(raw, count), null, why as string)
}

// --- when to ask at all -------------------------------------------------------

const long = 'x'.repeat(MIN_PAGE_CHARS_FOR_ORDERING)
const short = 'x'.repeat(MIN_PAGE_CHARS_FOR_ORDERING - 1)

assert.equal(shouldCheckPageOrder([long]), false, 'one page has no order to get wrong')
assert.equal(shouldCheckPageOrder([]), false)
assert.equal(shouldCheckPageOrder([long, long]), true)
assert.equal(
  shouldCheckPageOrder([long, short]),
  false,
  'a thin page makes the ordering a guess — leave it alone'
)

// --- applying -----------------------------------------------------------------

assert.deepEqual(applyPageOrder(['a', 'b'], [2, 1]), ['b', 'a'])
assert.deepEqual(applyPageOrder(['a', 'b', 'c'], [3, 1, 2]), ['c', 'a', 'b'])
assert.deepEqual(
  applyPageOrder(['a', 'b'], [1, 2]),
  ['a', 'b'],
  'identity leaves them alone'
)
// Reordering must never lose or invent a page, whatever the permutation.
for (const order of [[1, 2, 3], [3, 2, 1], [2, 3, 1]]) {
  const out = applyPageOrder(['a', 'b', 'c'], order)
  assert.equal(out.length, 3)
  assert.deepEqual([...out].sort(), ['a', 'b', 'c'])
}

assert.equal(isUploadOrder([1, 2, 3]), true)
assert.equal(isUploadOrder([2, 1]), false)
assert.equal(describePageOrder([2, 1]), '2 → 1')

// --- the prompt ---------------------------------------------------------------

const prompt = buildPageOrderPrompt(['first page text', 'second page text'])
assert.ok(prompt.includes('--- PAGE 1 ---'), 'pages are labelled')
assert.ok(prompt.includes('--- PAGE 2 ---'))
assert.ok(prompt.includes('first page text'))
assert.ok(prompt.includes('[1,2]'), 'the identity answer is spelled out')
assert.ok(
  prompt.includes('exactly once'),
  'the permutation requirement is stated, since the parser enforces it'
)

// Long pages are sent as head + tail: continuity lives at the seams, and the
// middle is what makes the call expensive.
const long2 = `START${'m'.repeat(5000)}END`
const excerpt = pageExcerpt(long2)
assert.ok(excerpt.startsWith('START'), 'the opening survives')
assert.ok(excerpt.endsWith('END'), 'the closing survives')
assert.ok(excerpt.includes('[…]'), 'the middle is elided')
assert.ok(excerpt.length < 1000, `excerpt should be bounded, got ${excerpt.length}`)
assert.equal(pageExcerpt('  short  text '), 'short text', 'short pages are sent whole')
assert.equal(pageExcerpt(''), '')

// --- the real incident ---------------------------------------------------------
//
// The two pages as they actually reached the marker on 2026-09-14: the ending
// arrived as page 1 and the opening as page 2. The model's job is to return
// [2,1]; ours is to apply it without losing a page.
const INCIDENT_PAGE_1 =
  'Page No. Date 9 Mais car je ne suis pas en forme, je pense que faire la premièrement ' +
  "le jogging me permet de developper l'endurance, et la natation permet developpe les " +
  "muscles. Et alors, faire ces petits changements à ma vie quotidienne sera bien pour ma santé."
const INCIDENT_PAGE_2 =
  'Les Questions pour Pratiquer Lundi le 14 septembre Cher Journal, Récemment je me suis ' +
  'rendu compte que je ne maintiens pas de vie saine, et je dois faire plus d\'exercice. ' +
  'Si je continue ma routine actuelle, il y aura un risque gigantesque de l\'obésité.'

assert.equal(
  shouldCheckPageOrder([INCIDENT_PAGE_1, INCIDENT_PAGE_2]),
  true,
  'both incident pages are substantial enough to judge'
)
const fixed = parsePageOrder('[2,1]', 2)!
assert.deepEqual(
  applyPageOrder([INCIDENT_PAGE_1, INCIDENT_PAGE_2], fixed),
  [INCIDENT_PAGE_2, INCIDENT_PAGE_1],
  'the diary opening leads once reordered'
)
assert.ok(
  applyPageOrder([INCIDENT_PAGE_1, INCIDENT_PAGE_2], fixed)[0]!.includes('Cher Journal'),
  'the salutation is now in the first page the examiner reads'
)

console.log('page-order.test.ts: ok')
