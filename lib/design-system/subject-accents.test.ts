import fs from 'node:fs'
import { getSubjectAccent, getSubjectColor } from './subject-accents'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const FALLBACK_HEX = '#8d8470'

// ── Every real subject has an accent ────────────────────────────────────────
// The map was keyed by Cambridge numeric codes only, so all 52 IB subjects fell
// through to the grey fallback and every IB lesson rendered in the same green.
const dirs = fs.readdirSync('content/courses').filter((d) => !d.startsWith('.'))
const missing = dirs.filter((d) => getSubjectColor(d) === FALLBACK_HEX)
if (missing.length) console.error('  no accent for:', missing.slice(0, 10).join(', '))
check('every subject has an accent', missing.length === 0)

// Both code shapes must agree — the canonical IB route passes the unprefixed
// slug, the legacy one passes the content code.
const ib = dirs.filter((d) => d.startsWith('ib-'))
const disagree = ib.filter((d) => getSubjectColor(d) !== getSubjectColor(d.slice(3)))
check('prefixed and catalog slugs agree', disagree.length === 0)

// HL and SL of the same subject are one subject and must match.
const hl = ib.filter((d) => d.endsWith('-hl'))
const levelMismatch = hl.filter((d) => {
  const sl = d.replace(/-hl$/, '-sl')
  return dirs.includes(sl) && getSubjectColor(d) !== getSubjectColor(sl)
})
check('HL and SL share an accent', levelMismatch.length === 0)

// ── There is genuine variety ────────────────────────────────────────────────
// The point of the accent is orientation: moving between subjects should look
// different. One colour for everything is the bug this replaces.
const palette = new Set(dirs.map((d) => getSubjectColor(d)))
check('more than four distinct accents in use', palette.size > 4)

// Neighbouring sciences must not collide, or the variety is cosmetic.
check('biology and chemistry differ', getSubjectColor('biology-hl') !== getSubjectColor('chemistry-hl'))
check('physics and chemistry differ', getSubjectColor('physics-hl') !== getSubjectColor('chemistry-hl'))
check('history and economics differ', getSubjectColor('history-hl') !== getSubjectColor('economics-hl'))

// ── Tokens resolve to CSS variables that exist ──────────────────────────────
const css = fs.readFileSync('lib/design-system/margin-notes-theme.css', 'utf8')
const tokens = new Set(dirs.map((d) => getSubjectAccent(d)))
const undefinedTokens = [...tokens].filter((t) => !css.includes(`--${t}:`))
if (undefinedTokens.length) console.error('  tokens with no CSS var:', undefinedTokens.join(', '))
check('every accent token has a CSS variable', undefinedTokens.length === 0)

check('unknown code falls back rather than throwing', getSubjectColor('not-a-subject') === FALLBACK_HEX)
check('null is safe', getSubjectColor(null) === FALLBACK_HEX)

if (failed > 0) process.exit(1)
console.log(
  `subject-accents.test.ts: all checks passed (${dirs.length} subjects, ${palette.size} distinct accents)`
)
