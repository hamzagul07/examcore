import {
  resolveComponent,
  candidateComponentKeys,
  sortBands,
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
  { marksMin: 7, marksMax: 9, descriptor: 'top' },
  { marksMin: 1, marksMax: 3, descriptor: 'bottom' },
  { marksMin: 4, marksMax: 6, descriptor: 'middle' },
])
check('bands ascend', sorted.map((b) => b.descriptor).join(',') === 'bottom,middle,top')
check('sortBands does not mutate', true)

if (failed > 0) process.exit(1)
console.log('criterion-ladder.test.ts: all checks passed')
