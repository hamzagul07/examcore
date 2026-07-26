import { groupByBlock, diagnoseBlock, type ExplanationDemandRow } from './confusion-report'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const row = (
  lesson: string,
  block: string,
  intent: string,
  count: number,
  body = ''
): ExplanationDemandRow => ({
  subject_code: '9702',
  lesson_slug: lesson,
  block_key: block,
  intent,
  request_count: count,
  body,
})

// --- grouping ---

const grouped = groupByBlock([
  row('a', 'b1', 'simpler', 5, 'the dense paragraph'),
  row('a', 'b1', 'why', 2),
  row('a', 'b2', 'example', 9),
  row('c', 'b1', 'simpler', 1),
])

check('one entry per (lesson, block)', grouped.length === 3)
check('ranked by total taps desc', grouped[0].total === 9 && grouped[0].blockKey === 'b2')
check('sums intents within a block', grouped.find((g) => g.blockKey === 'b1' && g.lessonSlug === 'a')!.total === 7)
check(
  'same block key in a different lesson stays separate',
  grouped.filter((g) => g.blockKey === 'b1').length === 2
)
check(
  'keeps a body sample for recognition',
  grouped.find((g) => g.lessonSlug === 'a' && g.blockKey === 'b1')!.sample === 'the dense paragraph'
)
check(
  'per-intent counts sorted desc',
  grouped.find((g) => g.lessonSlug === 'a' && g.blockKey === 'b1')!.byIntent[0].intent === 'simpler'
)

// Degenerate rows must not create phantom blocks.
check('skips rows with no block key', groupByBlock([row('a', '', 'simpler', 3)]).length === 0)
check('treats null count as zero', groupByBlock([{ ...row('a', 'b', 'why', 0), request_count: null }])[0].total === 0)

// --- diagnosis ---

const only = (counts: [string, number][]) =>
  diagnoseBlock(groupByBlock(counts.map(([i, c]) => row('L', 'B', i, c)))[0])

check('clear majority is diagnosed', only([['simpler', 8], ['why', 1]]) === 'simpler')
check('single intent is diagnosed', only([['example', 4]]) === 'example')

// A bare plurality is not a diagnosis: 2/2/1 means the paragraph fails several
// ways, and naming a winner would send someone to fix the wrong thing.
check('even split yields no diagnosis', only([['simpler', 2], ['why', 2], ['example', 1]]) === null)
check('exact half is not a majority', only([['simpler', 3], ['why', 3]]) === null)
check('zero taps yields no diagnosis', only([['simpler', 0]]) === null)

if (failed > 0) process.exit(1)
console.log('confusion-report.test.ts: all checks passed')
