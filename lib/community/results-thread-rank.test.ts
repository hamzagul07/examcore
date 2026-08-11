import { pickResultsThread, type RankableThread } from './results-thread-rank'

let failed = 0
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    failed++
    console.error(`FAIL ${label}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`)
  }
}

const CYCLE = Date.parse('2026-08-11T06:00:00.000Z')

function thread(over: Partial<RankableThread> & { id: string }): RankableThread {
  return {
    flair: 'Grade boundaries',
    is_pinned: false,
    created_at: '2026-08-11T09:00:00.000Z',
    ...over,
  }
}

// --- empty / no candidates ---
eq(pickResultsThread([], CYCLE), null, 'no rows -> null')

// --- the regression this exists for: a sticky pin from an earlier series must
// not outrank the live thread. 9702 had a pinned June-22 thread about the 2024
// boundaries sitting above the real June 2026 one. ---
const stalePin = thread({ id: 'stale-2024', is_pinned: true, created_at: '2026-06-22T10:00:00.000Z' })
const liveThread = thread({ id: 'live-2026', created_at: '2026-08-11T08:00:00.000Z' })
eq(pickResultsThread([stalePin, liveThread], CYCLE)?.id, 'live-2026', 'in-cycle beats stale pin')
eq(pickResultsThread([liveThread, stalePin], CYCLE)?.id, 'live-2026', 'order-independent')

// --- everything predates the cycle -> null, so the caller falls back to the
// subject room instead of linking last series' argument ---
eq(pickResultsThread([stalePin], CYCLE), null, 'all stale -> null')

// --- within the cycle, a pin is a deliberate moderator signal and wins ---
const pinnedNow = thread({ id: 'pinned', is_pinned: true, created_at: '2026-08-11T07:00:00.000Z' })
const newerUnpinned = thread({ id: 'newer', created_at: '2026-08-12T07:00:00.000Z' })
eq(pickResultsThread([newerUnpinned, pinnedNow], CYCLE)?.id, 'pinned', 'in-cycle pin beats newer')

// --- flair ordering: a boundaries thread answers the raw-mark question better
// than a generic results-day one ---
const resultsDay = thread({ id: 'rd', flair: 'Results day', created_at: '2026-08-12T09:00:00.000Z' })
const boundaries = thread({ id: 'gb', flair: 'Grade boundaries', created_at: '2026-08-11T09:00:00.000Z' })
eq(pickResultsThread([resultsDay, boundaries], CYCLE)?.id, 'gb', 'boundaries flair outranks results day')

// --- unknown / null flair sorts last but is still usable ---
const noFlair = thread({ id: 'none', flair: null, created_at: '2026-08-13T09:00:00.000Z' })
eq(pickResultsThread([noFlair, resultsDay], CYCLE)?.id, 'rd', 'known flair beats null flair')
eq(pickResultsThread([noFlair], CYCLE)?.id, 'none', 'null flair still selectable')

// --- ties on everything else fall back to newest ---
const older = thread({ id: 'older', created_at: '2026-08-11T09:00:00.000Z' })
const newer = thread({ id: 'newest', created_at: '2026-08-14T09:00:00.000Z' })
eq(pickResultsThread([older, newer], CYCLE)?.id, 'newest', 'tie -> newest wins')

// --- boundary condition: created exactly at cycle start counts as in-cycle ---
const exact = thread({ id: 'exact', created_at: '2026-08-11T06:00:00.000Z' })
eq(pickResultsThread([exact], CYCLE)?.id, 'exact', 'cycle start is inclusive')

if (failed) {
  console.error(`\nresults-thread-rank.test.ts: ${failed} FAILED`)
  process.exit(1)
}
console.log('results-thread-rank.test.ts: all passed')
