import { parseSeen, serializeSeen, hasSeen, nextHint, HINT_KEYS } from './first-run'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// ── Storage round-trip ──────────────────────────────────────────────────────
const seen = new Set([HINT_KEYS.explain])
check('round-trips', parseSeen(serializeSeen(seen)).has(HINT_KEYS.explain))
check('empty storage is empty', parseSeen(null).size === 0)
check('blank string is empty', parseSeen('').size === 0)

// Corrupt storage must not mean every hint fires forever, nor throw on a page load.
check('corrupt json is empty', parseSeen('{not json').size === 0)
check('wrong shape is empty', parseSeen('{"a":1}').size === 0)
check('non-string entries dropped', parseSeen('["explain-block",5,null]').size === 1)

check('hasSeen agrees', hasSeen(seen, HINT_KEYS.explain) && !hasSeen(seen, HINT_KEYS.quickCheck))

// ── Choosing a hint ─────────────────────────────────────────────────────────
const all = [HINT_KEYS.explain, HINT_KEYS.diagramSync, HINT_KEYS.quickCheck] as const

// At most one on screen — the page must never become a tutorial.
check('first unseen wins', nextHint(new Set(), all) === HINT_KEYS.explain)
check('skips what was seen', nextHint(new Set([HINT_KEYS.explain]), all) === HINT_KEYS.diagramSync)
check('nothing left returns null', nextHint(new Set(all), all) === null)
check('no candidates returns null', nextHint(new Set(), []) === null)

// Availability is the page's business: a lesson with no diagram must never be
// offered the diagram hint, however unseen it is.
check(
  'unavailable hints are never chosen',
  nextHint(new Set([HINT_KEYS.explain]), [HINT_KEYS.explain, HINT_KEYS.quickCheck]) ===
    HINT_KEYS.quickCheck
)

// Order is the contract: explain first, because a stuck reader is the person a
// hint can actually help.
check('explain is prioritised', nextHint(new Set(), all) === HINT_KEYS.explain)

if (failed > 0) process.exit(1)
console.log('first-run.test.ts: all checks passed')
