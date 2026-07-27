import {
  resolveComponent,
  candidateComponentKeys,
  sortBands,
  ladderFocus,
  focusMessage,
  FOCUS_RATIO,
} from './criterion-ladder'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

// --- Visual Arts: components named in prose, two of them split by level ---

const va = resolveComponent('ib-visual-arts-sl', 'Process portfolio')
check('visual arts subject code', va?.subjectCode === 'ib-visual-arts')
check('process portfolio key', va?.componentKey === 'process_portfolio')
check('level from the folder slug', va?.level === 'SL')
check(
  'comparative study recognised',
  resolveComponent('ib-visual-arts-hl', 'Comparative study')?.componentKey === 'comparative_study'
)
check(
  'exhibition recognised',
  resolveComponent('ib-visual-arts-hl', 'Part 3: Exhibition')?.componentKey === 'exhibition'
)
check('HL level detected', resolveComponent('ib-visual-arts-hl', 'Process portfolio')?.level === 'HL')

// The level-split keys must be tried before the bare one, or an HL student gets
// the SL rubric (different max marks).
check(
  'level-split key is tried first',
  JSON.stringify(candidateComponentKeys({ subjectCode: 'ib-visual-arts', componentKey: 'comparative_study', level: 'HL' })) ===
    JSON.stringify(['comparative_study_hl', 'comparative_study'])
)

// --- Language B: bare paper numbers, both languages share one rubric ---

check('french B maps to language B', resolveComponent('ib-french-b-hl', 'P1')?.subjectCode === 'ib-language-b')
check('spanish B maps to language B', resolveComponent('ib-spanish-b-sl', 'P2')?.subjectCode === 'ib-language-b')
check('P1 -> paper_1', resolveComponent('ib-french-b-hl', 'P1')?.componentKey === 'paper_1')
check('P2 -> paper_2', resolveComponent('ib-french-b-hl', 'P2')?.componentKey === 'paper_2')
check('spaced form parses', resolveComponent('ib-french-b-hl', 'p 1')?.componentKey === 'paper_1')
check('long form parses', resolveComponent('ib-french-b-hl', 'Paper 2')?.componentKey === 'paper_2')
check('individual oral', resolveComponent('ib-french-b-sl', 'Individual oral')?.componentKey === 'io')

// --- Lang-Lit ---

check('lang-lit HL essay', resolveComponent('ib-english-a-lang-lit-hl', 'HL essay')?.componentKey === 'hl_essay')

// --- Subjects with no criteria loaded must return null, not a guess ---

// Film, Music, Theatre and Dance have zero rows in ib_criterion. A ladder for
// them would have nothing verbatim to show, and paraphrasing IB descriptors is
// not acceptable.
check('film unmapped', resolveComponent('ib-film-hl', 'P1') === null)
check('music unmapped', resolveComponent('ib-music-sl', 'Paper 1') === null)
check('theatre unmapped', resolveComponent('ib-theatre-hl', 'Portfolio') === null)
check('dance unmapped', resolveComponent('ib-dance-sl', 'P1') === null)
check('cambridge unmapped', resolveComponent('9702', 'P1') === null)

// --- Degenerate input ---

check('missing paper', resolveComponent('ib-visual-arts-sl', undefined) === null)
check('empty paper', resolveComponent('ib-visual-arts-sl', '   ') === null)
check('unknown paper name', resolveComponent('ib-visual-arts-sl', 'Sketchbook') === null)

// --- Band ordering ---

const sorted = sortBands([
  { marksMin: 7, marksMax: 9 },
  { marksMin: 1, marksMax: 3 },
  { marksMin: 4, marksMax: 6 },
])
check('bands ascend', sorted.map((b) => b.marksMin).join(',') === '1,4,7')

// The public type must not carry descriptor prose — that is the whole point of
// the licensing split, and a stray field would put it back on indexed pages.
check(
  'band type carries no descriptor',
  Object.keys(sorted[0]).sort().join(',') === 'marksMax,marksMin'
)


// ── What the weightings mean for planning ───────────────────────────────────
// The ladder already shows the shares; the conclusion is the useful part. But
// it must refuse to invent one, because "focus here" about an even split is
// worse than silence.
function c(letter: string, maxMarks: number, name = 'Criterion ' + letter) {
  return { letter, name, maxMarks }
}

// A clearly dominant criterion is worth naming.
const dominant = ladderFocus([c('A', 6), c('B', 24), c('C', 6)])
check('dominant criterion is found', dominant.kind === 'single')
check('names the right one', dominant.kind === 'single' && dominant.letter === 'B')
check('share is of the real total', dominant.kind === 'single' && dominant.share === 67)
check('message names it', (focusMessage(dominant) ?? '').includes('B'))
check('message carries the share', (focusMessage(dominant) ?? '').includes('67%'))

// An even split has no focus, and a near-even one should not be dressed up as
// though it had. 34/33/33 is noise, not a plan.
check('even split says nothing', ladderFocus([c('A', 10), c('B', 10), c('C', 10)]).kind === 'none')
check('near-even split says nothing', ladderFocus([c('A', 34), c('B', 33), c('C', 33)]).kind === 'none')
check('message for none is null', focusMessage({ kind: 'none' }) === null)
// The threshold is where it says it is: a fifth again as much as an even share.
check('threshold is the documented ratio', FOCUS_RATIO === 1.2)
// Two criteria, 60/40 — 1.2x an even share exactly, so it counts.
const sixtyForty = ladderFocus([c('A', 60), c('B', 40)])
check('60/40 counts as a focus', sixtyForty.kind === 'single' && sixtyForty.letter === 'A')
// 55/45 is 1.1x — below the bar.
check('55/45 does not', ladderFocus([c('A', 55), c('B', 45)]).kind === 'none')

// Ties are named in full rather than resolved arbitrarily — picking one of two
// equal criteria would be a fabricated recommendation.
const tied = ladderFocus([c('A', 20), c('B', 20), c('C', 5), c('D', 5)])
check('ties are reported as ties', tied.kind === 'tied')
check('every tied criterion is named', tied.kind === 'tied' && tied.letters.join(',') === 'A,B')
check('tied message names both', (focusMessage(tied) ?? '').includes('A and B'))

// Degenerate inputs must not produce a claim.
check('single criterion has no focus', ladderFocus([c('A', 20)]).kind === 'none')
check('no criteria is safe', ladderFocus([]).kind === 'none')
check('all-zero marks is safe', ladderFocus([c('A', 0), c('B', 0)]).kind === 'none')
// A zero-mark criterion must not count toward the even-split baseline.
check('zero-mark criteria are ignored', ladderFocus([c('A', 10), c('B', 10), c('C', 0)]).kind === 'none')


if (failed > 0) process.exit(1)
console.log('criterion-ladder.test.ts: all checks passed')
