import assert from 'node:assert/strict'
import { detectIbPaperRef, type DetectablePaper } from './paper-detect'

const N21_P1 = 'N21/5/MATHX/SP1/ENG/TZ0/XX/M'
const M21_P1 = 'M21/5/MATHX/SP1/ENG/TZ1/XX/M'
const N21_P2 = 'N21/5/MATHX/SP2/ENG/TZ0/XX/M'
const M21_P2_TZ1 = 'M21/5/MATHX/SP2/ENG/TZ1/XX/M'
const M21_P2_TZ2 = 'M21/5/MATHX/SP2/ENG/TZ2/XX/M'

const paper = (ref: string): DetectablePaper => {
  const nov = ref.startsWith('N')
  return {
    ref,
    label: ref,
    session: nov ? 'November' : 'May',
    year: 2021,
    timezone: (ref.match(/TZ\d/) ?? ['TZ0'])[0],
  }
}
const P1 = [paper(N21_P1), paper(M21_P1)]
const P2 = [paper(N21_P2), paper(M21_P2_TZ1), paper(M21_P2_TZ2)]

// --- footer code uniquely identifies the paper, even for same-date timezones ---
assert.equal(detectIbPaperRef('working ... 8821 – 7104 ...', P1)?.ref, N21_P1)
assert.equal(detectIbPaperRef('working ... 2221 – 7109 ...', P1)?.ref, M21_P1)
// May P2 TZ1 vs TZ2 share the exam date — only the footer code separates them.
assert.equal(detectIbPaperRef('... 2221 – 7110 ...', P2)?.ref, M21_P2_TZ1)
assert.equal(detectIbPaperRef('... 2221 – 7115 ...', P2)?.ref, M21_P2_TZ2)
assert.equal(detectIbPaperRef('...22217115...'.replace('...', '2221-7115 '), P2)?.ref, M21_P2_TZ2)
assert.equal(detectIbPaperRef('code 2221-7110 here', P2)?.via, 'footer_code')

// --- session date line, when it maps to exactly one ingested paper ---
assert.equal(detectIbPaperRef('Monday 1 November 2021 (afternoon)', P1)?.ref, N21_P1)
assert.equal(detectIbPaperRef('Thursday 6 May 2021 (afternoon)', P1)?.ref, M21_P1)
assert.equal(detectIbPaperRef('November 2021', P1)?.via, 'session_date')

// --- session date that is AMBIGUOUS (May TZ1 + TZ2) must NOT guess ---
assert.equal(detectIbPaperRef('Friday 7 May 2021 (morning)', P2), null)

// --- explicit mark-scheme ref wins and is honoured ---
assert.equal(
  detectIbPaperRef('paper N21/5/MATHX/SP2/ENG/TZ0/XX/M q3', P2)?.via,
  'explicit_ref'
)
assert.equal(detectIbPaperRef('paper N21/5/MATHX/SP2/ENG/TZ0/XX/M q3', P2)?.ref, N21_P2)

// --- safety: never invent a paper we don't have, never guess with no signal ---
assert.equal(detectIbPaperRef('x = 5, therefore y = 10', P2), null)
assert.equal(detectIbPaperRef('8821 – 7104', P2), null) // P1's code, not in P2 list
assert.equal(detectIbPaperRef('anything', []), null)
assert.equal(detectIbPaperRef(null, P2), null)

console.log('paper-detect: all assertions passed')
