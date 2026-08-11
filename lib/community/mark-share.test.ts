import { markGap, markShareComment, usableComponents, type MarkComponent } from './mark-share'

let failed = 0
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    failed++
    console.error(`FAIL ${label}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`)
  }
}
function has(text: string, needle: string, label: string) {
  if (!text.includes(needle)) {
    failed++
    console.error(`FAIL ${label}: missing ${JSON.stringify(needle)}\n---\n${text}\n---`)
  }
}

// Real 9702 Paper 4 figures from the June 2026 table.
const p41: MarkComponent = {
  component: '41',
  paper: 'Paper 4',
  max: 100,
  thresholds: { A: 59, B: 51, C: 43, D: 35, E: 28 },
}

// --- the gap, at every interesting point on the ladder ---
const onA = markGap(p41, 59)
eq(onA.grade, 'A', 'exactly on the A counts as the A')
eq(onA.toNext, null, 'nothing above the top grade')
eq(onA.margin, 0, 'exactly on the A line has zero headroom')
eq(onA.dropsTo, 'B', 'the grade it would drop to is named')

const justUnder = markGap(p41, 57)
eq(justUnder.grade, 'B', 'two under the A is a B on this component')
eq(justUnder.toNext, 2, 'two marks off the A')
eq(justUnder.nextGrade, 'A', 'next grade named')
// 57 against a B line of 51 — six marks of headroom, not the 14 down to the C.
eq(justUnder.margin, 6, 'headroom is measured from the threshold cleared')
eq(justUnder.dropsTo, 'C', 'names what it would drop to')

const belowE = markGap(p41, 10)
eq(belowE.grade, null, 'below E has no grade')
eq(belowE.toNext, 18, 'distance to the E is reported')
eq(belowE.nextGrade, 'E', 'the next grade up from nothing is E')
eq(belowE.margin, null, 'no grade reached means no headroom')

// A mark far above the top threshold must not report a negative distance.
eq(markGap(p41, 100).toNext, null, 'top of the paper has nothing above it')

// --- the comment it writes ---
const text = markShareComment(p41, 57, justUnder)
has(text, 'Paper 4 (41)', 'names the component')
has(text, '57/100', 'states the raw mark')
has(text, '2 marks** off', 'states the gap')
has(text, 'total across papers', 'always carries the component caveat')
eq(text.includes('overall grade'), true, 'never implies a component is the overall grade')

const exact = markShareComment(p41, 59, onA)
has(exact, 'clears the **A**', 'reports the grade reached')

const one = markGap(p41, 58)
has(markShareComment(p41, 58, one), '1 mark** off', 'singular mark, not "1 marks"')

// --- component filtering ---
const usable = usableComponents([
  p41,
  { component: '99', paper: 'Paper 9', max: 0, thresholds: { A: 1 } },
  { component: '98', paper: 'Paper 9', max: 50, thresholds: {} },
])
eq(usable.length, 1, 'drops components with no max or no thresholds')
eq(usable[0].component, '41', 'keeps the usable one')

if (failed) {
  console.error(`\nmark-share.test.ts: ${failed} FAILED`)
  process.exit(1)
}
console.log('mark-share.test.ts: all passed')
