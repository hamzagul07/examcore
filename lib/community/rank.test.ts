import { communityHot, hotBoostFor, rankHot, PAID_HOT_BOOST } from './rank'

let failed = 0
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    failed++
    console.error(`FAIL ${label}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`)
  }
}
function near(actual: number, expected: number, label: string, tol = 1e-6) {
  if (Math.abs(actual - expected) > tol) {
    failed++
    console.error(`FAIL ${label}: got ${actual} want ~${expected}`)
  }
}

const T = '2026-08-11T12:00:00.000Z'

function post(over: { id: string; score?: number; createdAt?: string; isPinned?: boolean; paid?: boolean }) {
  return {
    id: over.id,
    score: over.score ?? 10,
    createdAt: over.createdAt ?? T,
    isPinned: over.isPinned ?? false,
    authorAccess: (over.paid ? 'max' : 'free') as 'max' | 'free',
  }
}

// --- communityHot must match the SQL: log10(score) + (epoch - 1700000000)/45000 ---
const epoch = Date.parse(T) / 1000
near(communityHot(100, T), 2 + (epoch - 1700000000) / 45000, 'hot matches SQL formula')
near(communityHot(0, T), 0 + (epoch - 1700000000) / 45000, 'score 0 floors the log at 1')
near(communityHot(-10, T), -1 + (epoch - 1700000000) / 45000, 'negative score flips sign')

// --- boost applies to every paid tier, never to free ---
eq(hotBoostFor('free'), 0, 'free gets no boost')
eq(hotBoostFor('pro'), PAID_HOT_BOOST, 'pro boosted')
eq(hotBoostFor('scholar'), PAID_HOT_BOOST, 'scholar boosted')
eq(hotBoostFor('max'), PAID_HOT_BOOST, 'max boosted')

// --- the point of the whole thing: paid beats free at equal quality ---
eq(
  rankHot([post({ id: 'free' }), post({ id: 'paid', paid: true })])[0].id,
  'paid',
  'paid outranks free at equal score'
)

// --- but a clearly better free post still wins. 0.35 is worth ~2.2x the votes,
// so 10 -> 60 must be enough to overcome it. This is the guarantee that keeps
// the feed from becoming pay-to-be-seen. ---
eq(
  rankHot([post({ id: 'paid', score: 10, paid: true }), post({ id: 'free', score: 60 })])[0].id,
  'free',
  'better free post still outranks a boosted one'
)

// --- and the boost is not so small as to be meaningless: it should survive a
// modest score gap the other way ---
eq(
  rankHot([post({ id: 'paid', score: 10, paid: true }), post({ id: 'free', score: 15 })])[0].id,
  'paid',
  'boost survives a small score gap'
)

// --- pins outrank everything, boost included ---
eq(
  rankHot([post({ id: 'paid', score: 999, paid: true }), post({ id: 'pinned', score: 1, isPinned: true })])[0].id,
  'pinned',
  'pinned beats a boosted post'
)

// --- ties fall back to newest ---
eq(
  rankHot([
    post({ id: 'older', createdAt: '2026-08-11T10:00:00.000Z' }),
    post({ id: 'newer', createdAt: '2026-08-11T11:00:00.000Z' }),
  ])[0].id,
  'newer',
  'tie -> newest first'
)

// --- ranking must not mutate the input array ---
const input = [post({ id: 'a' }), post({ id: 'b', paid: true })]
rankHot(input)
eq(input[0].id, 'a', 'input array left untouched')

if (failed) {
  console.error(`\nrank.test.ts: ${failed} FAILED`)
  process.exit(1)
}
console.log('rank.test.ts: all passed')
