import { communityPostHref, postSlug, shortIdFromSlug, shortPostId } from './post-url'

let failed = 0
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    failed++
    console.error(`FAIL ${label}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`)
  }
}

// --- short id ---
eq(shortPostId('b5000001-0000-4000-8000-000000000001'), 'b5000001', 'short id is the first block')
eq(shortPostId('B5000001-0000-4000-8000-000000000001'), 'b5000001', 'short id lowercases')

// --- slug ---
eq(
  postSlug('How do you structure a 9708 economics essay for the evaluation marks?'),
  // 68 characters — under the cap, so nothing is dropped.
  'how-do-you-structure-a-9708-economics-essay-for-the-evaluation-marks',
  'real title slugs cleanly'
)
eq(postSlug('9702 Physics: June 2026 thresholds are out'), '9702-physics-june-2026-thresholds-are-out', 'punctuation collapses')
eq(postSlug('  Spaced   out  '), 'spaced-out', 'whitespace collapses, no leading or trailing dash')
eq(postSlug('!!!'), 'post', 'a title with nothing usable still yields a slug')
eq(postSlug(''), 'post', 'empty title still yields a slug')
eq(postSlug('Café société'), 'cafe-societe', 'accents are folded, not dropped')
eq(postSlug('gng listen'), 'gng-listen', 'short titles pass through')

// --- slugs never end mid-word or with a dash ---
const long = postSlug('A very long title about grade boundaries and thresholds and everything else besides')
eq(long.endsWith('-'), false, 'no trailing dash after truncation')
eq(long.length <= 72, true, 'respects the length cap')
eq(
  long,
  'a-very-long-title-about-grade-boundaries-and-thresholds-and-everything',
  'truncates on a word boundary'
)
eq(long.split('-').pop(), 'everything', 'the last word is whole, not a fragment')

// --- href ---
eq(
  communityPostHref({
    id: 'b5000001-0000-4000-8000-000000000001',
    subjectCode: '9708',
    title: 'How do you structure a 9708 economics essay for the evaluation marks?',
  }),
  '/community/9708/how-do-you-structure-a-9708-economics-essay-for-the-evaluation-marks-b5000001',
  'href puts subject first, then slug, then short id'
)
eq(
  communityPostHref({ id: 'aaaabbbb-0000-4000-8000-000000000001', subjectCode: 'math-aa-hl', title: 'IA topics' }),
  '/community/math-aa-hl/ia-topics-aaaabbbb',
  'IB subject slugs survive intact'
)

// --- round trip: the id must always be recoverable from what we generate ---
for (const [id, subject, title] of [
  ['b5000001-0000-4000-8000-000000000001', '9708', 'How do you structure an essay?'],
  ['ffbd9192-edd4-4c10-b2d1-5e3fab727b5b', '9618', '!!!'],
  ['a417f05c-8446-4eb4-b17c-d60218ac59e5', '9990', 'A title that is quite a lot longer than the cap allows for sure'],
] as const) {
  const href = communityPostHref({ id, subjectCode: subject, title })
  eq(shortIdFromSlug(href.split('/').pop()!), shortPostId(id), `round trip: ${title.slice(0, 24)}`)
}

// --- garbage tails do not resolve to a post ---
eq(shortIdFromSlug('how-do-you-structure-an-essay'), null, 'a slug with no id tail returns null')
eq(shortIdFromSlug('essay-zzzzzzzz'), null, 'a non-hex tail returns null')
eq(shortIdFromSlug('essay-b500000'), null, 'a too-short tail returns null')
eq(shortIdFromSlug(''), null, 'empty returns null')

if (failed) {
  console.error(`\npost-url.test.ts: ${failed} FAILED`)
  process.exit(1)
}
console.log('post-url.test.ts: all passed')
