import {
  isUsableHandoff,
  serializeHandoff,
  parseHandoff,
  MAX_ANSWER_CHARS,
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

if (failed > 0) process.exit(1)
console.log('mark-handoff.test.ts: all checks passed')
