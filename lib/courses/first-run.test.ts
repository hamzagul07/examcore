import fs from 'node:fs'
import { parseSeen, serializeSeen, hasSeen, nextHint, HINT_KEYS } from './first-run'

const keyName = (v: string) =>
  (Object.keys(HINT_KEYS) as (keyof typeof HINT_KEYS)[]).find((k) => HINT_KEYS[k] === v) ?? ''

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
const all = Object.values(HINT_KEYS)

// At most one on screen — the page must never become a tutorial.
check('first unseen wins', nextHint(new Set(), all) === HINT_KEYS.explain)
check('skips what was seen', nextHint(new Set([HINT_KEYS.explain]), all) === HINT_KEYS.studyMode)
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
// hint can actually help; study mode second, because it is the only one that
// changes how the whole page works and learning that on your fourth visit is
// learning it too late.
check('explain is prioritised', nextHint(new Set(), all) === HINT_KEYS.explain)
check(
  'study mode comes second',
  nextHint(new Set([HINT_KEYS.explain]), all) === HINT_KEYS.studyMode
)

// Every key must have copy, or the hint renders as an empty box. Read the real
// component rather than trusting a second list here.
const hintSrc = fs.readFileSync('components/courses/FeatureHint.tsx', 'utf8')
const uncopied = all.filter((k) => !hintSrc.includes(`[HINT_KEYS.${keyName(k)}]`))
if (uncopied.length) console.error('  hint keys with no copy:', uncopied.join(', '))
check('every hint key has copy', uncopied.length === 0)

if (failed > 0) process.exit(1)
console.log('first-run.test.ts: all checks passed')
