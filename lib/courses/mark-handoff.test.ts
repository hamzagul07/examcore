import {
  isUsableHandoff,
  serializeHandoff,
  parseHandoff,
  MAX_ANSWER_CHARS,
  splitSubjectLevel,
  subjectCandidates,
  MARK_HANDOFF_PARAM,
  MARK_HANDOFF_VALUE,
  type MarkHandoff,
} from './mark-handoff'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const good: MarkHandoff = {
  question: 'Explain why water is a polar molecule. [4]',
  answer: 'Oxygen is more electronegative than hydrogen, so the bonding electrons sit closer to it.',
  subjectCode: '9700',
  returnPath: '/courses/9700/a1-1-water',
  totalMarks: 4,
}

// ── Only hand off when there is something to hand ───────────────────────────
// Half a form the student did not ask for is worse than the clean page they
// expected, so both halves must be real.
check('a full handoff is usable', isUsableHandoff(good))
check('no answer is not usable', !isUsableHandoff({ ...good, answer: '' }))
check('no question is not usable', !isUsableHandoff({ ...good, question: '' }))
check('a one-word answer is not usable', !isUsableHandoff({ ...good, answer: 'yes' }))
check('a stub question is not usable', !isUsableHandoff({ ...good, question: 'Why?' }))
check('whitespace does not count', !isUsableHandoff({ ...good, answer: '            ' }))
check('null is not usable', !isUsableHandoff(null))
check('undefined is not usable', !isUsableHandoff(undefined))

// ── Round trip ──────────────────────────────────────────────────────────────
const back = parseHandoff(serializeHandoff(good))
check('round trips', !!back)
check('keeps the question', back?.question === good.question)
check('keeps the answer', back?.answer === good.answer)
check('keeps the subject', back?.subjectCode === '9700')
check('keeps the return path', back?.returnPath === '/courses/9700/a1-1-water')
check('keeps the marks', back?.totalMarks === 4)

// ── Corrupt storage means a normal page, never a crash ──────────────────────
check('null is safe', parseHandoff(null) === null)
check('garbage is safe', parseHandoff('not json') === null)
check('an array is safe', parseHandoff('[1,2,3]') === null)
check('a half handoff is rejected', parseHandoff('{"question":"Explain water fully"}') === null)
check(
  'nonsense marks are dropped rather than passed on',
  parseHandoff(serializeHandoff({ ...good, totalMarks: -3 }))?.totalMarks === null
)
check(
  'a missing subject becomes null, not undefined',
  parseHandoff(serializeHandoff({ ...good, subjectCode: undefined }))?.subjectCode === null
)

// An answer longer than the cap is truncated, not dropped — losing the tail of
// a long answer beats losing the whole handoff.
const huge = { ...good, answer: 'x'.repeat(MAX_ANSWER_CHARS + 500) }
const capped = parseHandoff(serializeHandoff(huge))
check('an over-long answer survives', !!capped)
check('and is capped', (capped?.answer.length ?? 0) === MAX_ANSWER_CHARS)

check('the param names are stable', MARK_HANDOFF_PARAM === 'from' && MARK_HANDOFF_VALUE === 'lesson')


// ── Subject and level travel separately ─────────────────────────────────────
// Lessons are keyed by level ("ib-biology-hl"); the marker's picker is not
// ("ib-biology" plus an HL/SL control). Sending the lesson code straight
// through selected nothing, silently, and left submit enabled against a
// subject that was never really chosen.
{
  const hl = splitSubjectLevel('ib-biology-hl')
  check('strips the level', hl.subjectCode === 'ib-biology')
  check('and keeps it', hl.ibLevel === 'HL')
  check('SL too', splitSubjectLevel('ib-history-sl').ibLevel === 'SL')
  check('uppercase suffix', splitSubjectLevel('ib-biology-HL').subjectCode === 'ib-biology')
  // Cambridge codes have no level and must pass through untouched.
  check('cambridge is untouched', splitSubjectLevel('9700').subjectCode === '9700')
  check('cambridge has no level', splitSubjectLevel('9700').ibLevel === null)
  check('null is safe', splitSubjectLevel(null).subjectCode === null)
  check('empty is safe', splitSubjectLevel('').subjectCode === null)
  // A subject that merely ends in those letters must not be mangled.
  check('only a real suffix counts', splitSubjectLevel('ib-global-politics').subjectCode === 'ib-global-politics')
}
check('level round trips', parseHandoff(serializeHandoff({ ...good, ibLevel: 'HL' }))?.ibLevel === 'HL')
check('a bogus level is dropped', parseHandoff('{"question":"Explain water properly","answer":"because it is polar and bent","ibLevel":"XL"}')?.ibLevel === null)


// ── Both subject shapes, because the picker uses both ───────────────────────
// Catalogued IB subjects are listed level-less with a separate HL/SL control
// ("ib-biology"); the rest are legacy codes carrying their level
// ("ib-history-hl"). Committing to one shape silently selected nothing for
// every subject that used the other — verified in a browser against both.
check('an IB code offers level-less first', subjectCandidates('ib-biology-hl')[0] === 'ib-biology')
check('and keeps the full code as a fallback', subjectCandidates('ib-biology-hl')[1] === 'ib-biology-hl')
check('exactly two candidates', subjectCandidates('ib-history-hl').length === 2)
// Cambridge has one shape and must not gain a phantom alternative.
check('cambridge offers itself only', subjectCandidates('9700').join(',') === '9700')
check('an IB subject with no level offers itself only', subjectCandidates('ib-tok').join(',') === 'ib-tok')
check('nothing in, nothing out', subjectCandidates(null).length === 0)
check('blank in, nothing out', subjectCandidates('   ').length === 0)

if (failed > 0) process.exit(1)
console.log('mark-handoff.test.ts: all checks passed')
