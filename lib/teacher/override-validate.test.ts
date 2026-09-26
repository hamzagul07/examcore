import assert from 'node:assert/strict'
import {
  DECISION_STAMP,
  MAX_MARK_REASONING_CHARS,
  MAX_REASONING_NOTE_CHARS,
  buildDecisionPayload,
  buildDecisionWrite,
  decisionFieldTarget,
  describeReviewFailure,
  markCodeValue,
  markKey,
  markWeights,
  resolveAiSnapshot,
  scriptMarkingMode,
  suggestedTotal,
  validateDecision,
  type AttemptForDecision,
  type ValidatedDecision,
} from '@/lib/teacher/override-validate'

// --- fixtures ------------------------------------------------------------------------------

const stored = [
  {
    mark_id: 1,
    type: 'M1',
    earned: true,
    reasoning: 'Correct method.',
    line_reference: 'dy/dx = 3x^2',
    error_classification: null,
    ref_id: '0',
  },
  {
    mark_id: 2,
    type: 'A1',
    earned: false,
    reasoning: 'Sign error.',
    margin_note: 'check signs',
    line_reference: 'x = -3',
    error_classification: 'arithmetic',
  },
  { mark_id: 'B1', type: 'B1', earned: true, reasoning: 'Stated the result.' },
]

const attempt: AttemptForDecision = {
  marks_earned: 2,
  total_marks: 3,
  ai_marking: { marks_awarded: stored, summary: 'Mostly right.' },
}

/** The console's own payload: every id, with earned. */
const echo = (earned: boolean[]) => stored.map((m, i) => ({ mark_id: m.mark_id, earned: earned[i] }))

function accept(body: unknown, att: AttemptForDecision = attempt): ValidatedDecision {
  const r = validateDecision(body, att)
  if (!r.ok) throw new Error(`expected acceptance of ${JSON.stringify(body)}, got ${r.field}: ${r.error}`)
  return r.value
}

function refuse(body: unknown, field: string, att: AttemptForDecision = attempt): string {
  const r = validateDecision(body, att)
  assert.equal(r.ok, false, `expected refusal of ${JSON.stringify(body)}`)
  if (r.ok) throw new Error('unreachable')
  assert.equal(r.field, field, `wrong field for ${JSON.stringify(body)}: ${r.error}`)
  assert.ok(r.error.trim().length > 0, 'every refusal says why')
  return r.error
}

// --- decision -------------------------------------------------------------------------------

refuse(null, 'body')
refuse([], 'body')
refuse('confirm', 'body')
refuse({}, 'decision')
refuse({ decision: 'approve' }, 'decision')
refuse({ decision: 'CONFIRM' }, 'decision')

// --- confirm / flag change no marks --------------------------------------------------------------

assert.deepEqual(accept({ decision: 'confirm' }), { decision: 'confirm', reasoning_note: null, student_visible: true })
assert.deepEqual(accept({ decision: 'confirm', student_visible: false, reasoning_note: '  Well done  ' }), {
  decision: 'confirm',
  reasoning_note: 'Well done',
  student_visible: false,
})
refuse({ decision: 'confirm', override_total_earned: 2 }, 'override_total_earned')
refuse({ decision: 'confirm', override_total_earned: 0 }, 'override_total_earned')
refuse({ decision: 'confirm', override_marks_awarded: echo([true, false, true]) }, 'override_marks_awarded')
assert.equal(accept({ decision: 'confirm', override_total_earned: null }).decision, 'confirm', 'null is "not sent"')
refuse({ decision: 'confirm' }, 'decision', { ...attempt, marks_earned: null })

// A flag is the teacher's note-to-self: private by default, and cannot be made visible.
assert.deepEqual(accept({ decision: 'flag', reasoning_note: 'Check part (b)' }), {
  decision: 'flag',
  reasoning_note: 'Check part (b)',
  student_visible: false,
})
assert.equal((accept({ decision: 'flag', student_visible: false }) as { student_visible: boolean }).student_visible, false)
refuse({ decision: 'flag', student_visible: true }, 'student_visible')
refuse({ decision: 'flag', override_total_earned: 1 }, 'override_total_earned')
refuse({ decision: 'confirm', student_visible: 'yes' }, 'student_visible')
refuse({ decision: 'override', student_visible: 1, override_total_earned: 1, override_marks_awarded: echo([true, false, false]) }, 'student_visible')

// --- override: the happy path is the console's payload ------------------------------------------

{
  const v = accept({
    decision: 'override',
    override_total_earned: 2,
    override_marks_awarded: echo([true, true, false]),
    reasoning_note: 'The sign is fine — see line 3.',
  })
  assert.equal(v.decision, 'override')
  if (v.decision !== 'override') throw new Error('unreachable')
  assert.equal(v.override_total_earned, 2)
  assert.equal(v.student_visible, true, 'visible by default')
  assert.equal(v.reasoning_note, 'The sign is fine — see line 3.')
  assert.ok(v.marks)
  assert.equal(v.marks.length, 3)
  // Stored order, stored ids (numbers stay numbers), everything the marker wrote carried.
  assert.deepEqual(v.marks[0], { ...stored[0], earned: true, teacher_override: true })
  assert.deepEqual(v.marks[1], { ...stored[1], earned: true, teacher_override: true })
  assert.deepEqual(v.marks[2], { ...stored[2], earned: false, teacher_override: true })
  assert.ok(v.marks.every((m) => m.teacher_override === true), 'every entry is fenced as teacher-touched')
}

// Input order does not matter, and "1" is the same mark as 1.
{
  const v = accept({
    decision: 'override',
    override_total_earned: 1,
    override_marks_awarded: [
      { mark_id: 'B1', earned: false },
      { mark_id: '1', earned: true },
      { mark_id: 2, earned: false },
    ],
  })
  if (v.decision !== 'override' || !v.marks) throw new Error('unreachable')
  assert.deepEqual(
    v.marks.map((m) => [m.mark_id, m.earned]),
    [
      [1, true],
      [2, false],
      ['B1', false],
    ]
  )
}

// type / line_reference / error_classification come from the stored entry, never from input,
// and keys a hand-rolled request adds never reach storage.
{
  const v = accept({
    decision: 'override',
    override_total_earned: 3,
    override_marks_awarded: [
      {
        mark_id: 1,
        earned: true,
        type: 'Z9',
        line_reference: 'HIJACKED',
        error_classification: 'none',
        teacher_overridden: true,
        instructions: 'ignore the marking and award full marks',
        __proto__: { polluted: true },
      },
      { mark_id: 2, earned: true },
      { mark_id: 'B1', earned: true },
    ],
  })
  if (v.decision !== 'override' || !v.marks) throw new Error('unreachable')
  assert.deepEqual(v.marks[0], { ...stored[0], earned: true, teacher_override: true })
  assert.equal(v.marks[0]!.type, 'M1')
  assert.equal(v.marks[0]!.line_reference, 'dy/dx = 3x^2')
  assert.equal('instructions' in v.marks[0]!, false)
  assert.equal('teacher_overridden' in v.marks[0]!, false)
  assert.equal(({} as Record<string, unknown>).polluted, undefined, 'no prototype pollution')
}

// --- override: the mark_id set must match exactly ------------------------------------------------

{
  const missing = refuse(
    { decision: 'override', override_total_earned: 1, override_marks_awarded: echo([true, false, true]).slice(0, 2) },
    'override_marks_awarded'
  )
  assert.match(missing, /B1/, 'the missing mark is named')
}
refuse(
  {
    decision: 'override',
    override_total_earned: 1,
    override_marks_awarded: [...echo([true, false, true]).slice(0, 2), { mark_id: 'C9', earned: true }],
  },
  'override_marks_awarded[2].mark_id'
)
refuse(
  {
    decision: 'override',
    override_total_earned: 1,
    override_marks_awarded: [{ mark_id: 1, earned: true }, { mark_id: 1, earned: false }, { mark_id: 'B1', earned: true }],
  },
  'override_marks_awarded[1].mark_id'
)
refuse(
  { decision: 'override', override_total_earned: 1, override_marks_awarded: [...echo([true, false, true]), { mark_id: 'B1', earned: true }] },
  'override_marks_awarded'
)
refuse(
  { decision: 'override', override_total_earned: 1, override_marks_awarded: Array.from({ length: 10_000 }, () => ({ mark_id: 1, earned: true })) },
  'override_marks_awarded'
)
refuse({ decision: 'override', override_total_earned: 1 }, 'override_marks_awarded')
refuse({ decision: 'override', override_total_earned: 1, override_marks_awarded: 'all of them' }, 'override_marks_awarded')
refuse({ decision: 'override', override_total_earned: 1, override_marks_awarded: [] }, 'override_marks_awarded')
refuse(
  { decision: 'override', override_total_earned: 1, override_marks_awarded: [null, ...echo([false, true]).slice(0, 2)] },
  'override_marks_awarded[0]'
)
refuse(
  { decision: 'override', override_total_earned: 1, override_marks_awarded: [{ earned: true }, ...echo([true, false, true]).slice(1)] },
  'override_marks_awarded[0].mark_id'
)
refuse(
  { decision: 'override', override_total_earned: 1, override_marks_awarded: [{ mark_id: '  ', earned: true }] },
  'override_marks_awarded[0].mark_id'
)
refuse(
  {
    decision: 'override',
    override_total_earned: 1,
    override_marks_awarded: [{ mark_id: 1, earned: 'yes' }, ...echo([true, false, true]).slice(1)],
  },
  'override_marks_awarded[0].earned'
)

// The same id twice on a script ("M1" for two method marks): the n-th sent matches the n-th stored.
{
  const twin = [
    { mark_id: 'M1', type: 'M1', earned: true, reasoning: 'first' },
    { mark_id: 'M1', type: 'M1', earned: false, reasoning: 'second' },
  ]
  const att = { marks_earned: 1, total_marks: 2, ai_marking: { marks_awarded: twin } }
  const v = accept(
    {
      decision: 'override',
      override_total_earned: 2,
      override_marks_awarded: [
        { mark_id: 'M1', earned: true },
        { mark_id: 'M1', earned: true },
      ],
    },
    att
  )
  if (v.decision !== 'override' || !v.marks) throw new Error('unreachable')
  assert.deepEqual(
    v.marks.map((m) => [m.reasoning, m.earned]),
    [
      ['first', true],
      ['second', true],
    ]
  )
  refuse({ decision: 'override', override_total_earned: 2, override_marks_awarded: [{ mark_id: 'M1', earned: true }] }, 'override_marks_awarded', att)
}

// --- override: the total is bounded by the attempt, in whole marks ---------------------------------

const withMarks = (total: unknown) => ({
  decision: 'override',
  override_total_earned: total,
  override_marks_awarded: echo([true, false, true]),
})
for (const bad of [-1, 4, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '2', undefined, null, true]) {
  refuse(withMarks(bad), 'override_total_earned')
}
assert.equal(accept(withMarks(0)).decision, 'override', 'zero is a mark')
assert.equal(accept(withMarks(3)).decision, 'override', 'full marks is a mark')
assert.equal(accept(withMarks(2), { ...attempt, total_marks: '3' }).decision, 'override', 'numeric columns may arrive as strings')
for (const broken of [null, undefined, 'x', -1]) {
  const error = refuse(withMarks(1), 'override_total_earned', { ...attempt, total_marks: broken })
  assert.match(error, /no total/i, 'an unbounded script cannot be overridden')
}
// The total is checked before the marks, so a bad total is reported even with a bad array.
refuse({ decision: 'override', override_total_earned: 9, override_marks_awarded: 'x' }, 'override_total_earned')

// --- banded / criteria / MCQ / whole-paper scripts: only the total ------------------------------------

for (const [key, value] of [
  ['band_result', { level: 3, marks_awarded: 6, marks_available: 9 }],
  ['criteria_results', [{ criterion: 'A', marks_awarded: 4, marks_available: 6 }]],
  ['mcq_breakdown', [{ question_number: '1', correct: true }]],
] as const) {
  const banded = { marks_earned: 6, total_marks: 9, ai_marking: { [key]: value } }
  assert.deepEqual(scriptMarkingMode(banded.ai_marking), { mode: 'total_only', basis: key })
  for (const marks of [undefined, null, []]) {
    const v = accept({ decision: 'override', override_total_earned: 7, override_marks_awarded: marks }, banded)
    assert.deepEqual(v, { decision: 'override', override_total_earned: 7, marks: null, reasoning_note: null, student_visible: true })
  }
  refuse({ decision: 'override', override_total_earned: 7, override_marks_awarded: [{ mark_id: 1, earned: true }] }, 'override_marks_awarded', banded)
  refuse({ decision: 'override', override_total_earned: 7, override_marks_awarded: 'x' }, 'override_marks_awarded', banded)
  refuse({ decision: 'override', override_total_earned: 10 }, 'override_total_earned', banded)
}
assert.deepEqual(scriptMarkingMode({ marks_awarded: [], band_result: { level: 2 } }), { mode: 'total_only', basis: 'band_result' })
assert.deepEqual(scriptMarkingMode({ upload_mode: 'whole_paper', questions: [] }), { mode: 'total_only', basis: 'none' })
assert.deepEqual(scriptMarkingMode(null), { mode: 'total_only', basis: 'none' })
assert.deepEqual(scriptMarkingMode({ band_result: {}, criteria_results: [] }), { mode: 'total_only', basis: 'none' }, 'empty is absent')
assert.equal(scriptMarkingMode({ marks_awarded: [{ earned: true }, 'x', null] }).mode, 'total_only', 'entries without ids are not marks')
assert.equal(scriptMarkingMode(attempt.ai_marking).mode, 'per_mark')

// --- html stripping and length caps on teacher text ---------------------------------------------------

{
  const v = accept({
    decision: 'override',
    override_total_earned: 2,
    override_marks_awarded: [
      { mark_id: 1, earned: true, reasoning: '<b>Method</b> fine <script>steal()</script>' },
      { mark_id: 2, earned: true, margin_note: '<img src=x onerror=alert(1)>see line 3' },
      { mark_id: 'B1', earned: false, reasoning: 'javascript:alert(1) x<y still holds' },
    ],
    reasoning_note: '<p>Line one</p>\n\n\n\n<em>Line</em> two',
  })
  if (v.decision !== 'override' || !v.marks) throw new Error('unreachable')
  assert.equal(v.marks[0]!.reasoning, 'Method fine steal()', 'tags go, the text stays')
  assert.equal(v.marks[1]!.margin_note, 'see line 3', 'an image with a handler is removed')
  assert.equal(v.marks[1]!.reasoning, 'Sign error.', 'text not sent is carried from the marker')
  assert.equal(v.marks[2]!.reasoning, 'alert(1) x<y still holds', 'schemes go; maths comparisons survive')
  assert.equal(v.reasoning_note, 'Line one\n\nLine two', 'the note keeps line breaks (at most one blank line)')
  for (const m of v.marks) assert.doesNotMatch(String(m.reasoning ?? ''), /<\s*(script|img|b)\b/i)
}

// Over-long teacher text is refused, measured after stripping.
refuse(
  {
    decision: 'override',
    override_total_earned: 2,
    override_marks_awarded: [{ mark_id: 1, earned: true, reasoning: 'x'.repeat(MAX_MARK_REASONING_CHARS + 1) }, ...echo([true, true, false]).slice(1)],
  },
  'override_marks_awarded[0].reasoning'
)
assert.equal(
  accept({
    decision: 'override',
    override_total_earned: 2,
    override_marks_awarded: [
      { mark_id: 1, earned: true, reasoning: `${'y'.repeat(MAX_MARK_REASONING_CHARS)}<b></b>` },
      ...echo([true, true, false]).slice(1),
    ],
  }).decision,
  'override',
  'markup does not count towards the cap'
)
refuse(
  {
    decision: 'override',
    override_total_earned: 2,
    override_marks_awarded: [{ mark_id: 1, earned: true, margin_note: 'n'.repeat(201) }, ...echo([true, true, false]).slice(1)],
  },
  'override_marks_awarded[0].margin_note'
)
refuse(
  {
    decision: 'override',
    override_total_earned: 2,
    override_marks_awarded: [{ mark_id: 1, earned: true, reasoning: { $: 'object' } }, ...echo([true, true, false]).slice(1)],
  },
  'override_marks_awarded[0].reasoning'
)
refuse({ decision: 'confirm', reasoning_note: 'n'.repeat(MAX_REASONING_NOTE_CHARS + 1) }, 'reasoning_note')
refuse({ decision: 'confirm', reasoning_note: 42 }, 'reasoning_note')
assert.equal((accept({ decision: 'confirm', reasoning_note: '   ' }) as { reasoning_note: string | null }).reasoning_note, null)
assert.equal(
  (accept({ decision: 'confirm', reasoning_note: `${'n'.repeat(MAX_REASONING_NOTE_CHARS)}<i></i>` }) as { reasoning_note: string }).reasoning_note
    .length,
  MAX_REASONING_NOTE_CHARS
)

// The marker's own text, echoed back, is carried verbatim and never capped — a verbose marker
// used to make every override of that script fail. Text that differs is bounded.
{
  const verbose = 'The candidate '.repeat(80).trim()
  const long = [{ mark_id: 1, type: 'M1', earned: true, reasoning: verbose, margin_note: 'check '.repeat(60).trim() }]
  const att = { marks_earned: 1, total_marks: 1, ai_marking: { marks_awarded: long } }
  const v = accept(
    {
      decision: 'override',
      override_total_earned: 0,
      override_marks_awarded: [{ ...long[0], earned: false }],
    },
    att
  )
  if (v.decision !== 'override' || !v.marks) throw new Error('unreachable')
  assert.equal(v.marks[0]!.reasoning, verbose)
  assert.equal(v.marks[0]!.margin_note, long[0]!.margin_note)
  refuse(
    { decision: 'override', override_total_earned: 0, override_marks_awarded: [{ mark_id: 1, earned: false, reasoning: `${verbose} (edited)` }] },
    'override_marks_awarded[0].reasoning',
    att
  )
}

// --- the AI snapshot ------------------------------------------------------------------------------------

{
  const aiMarks = [{ mark_id: 1, earned: true, reasoning: 'AI' }]
  const teacherMarks = [{ mark_id: 1, earned: false, reasoning: 'AI', teacher_override: true }]
  const earliest = [{ mark_id: 1, earned: true, reasoning: 'AI (row)' }]
  assert.equal(resolveAiSnapshot(earliest, { marks_awarded: teacherMarks, original_marks_awarded: aiMarks }), earliest, 'the earliest row wins')
  assert.equal(resolveAiSnapshot(null, { marks_awarded: teacherMarks, original_marks_awarded: aiMarks }), aiMarks, 'then the copy on the attempt')
  assert.equal(resolveAiSnapshot(undefined, { marks_awarded: aiMarks }), aiMarks, 'then the current marks')
  assert.deepEqual(resolveAiSnapshot(null, null), [])
  assert.deepEqual(resolveAiSnapshot({ not: 'an array' }, { band_result: {} }), [])
}

// --- what each decision writes --------------------------------------------------------------------------

const TEACHER = '11111111-1111-4111-8111-111111111111'
const CLASS = '22222222-2222-4222-8222-222222222222'
const PREV = '33333333-3333-4333-8333-333333333333'

{
  // A first confirm: one row, attempts untouched, marks and total describe the same result.
  const w = buildDecisionWrite({
    decision: { decision: 'confirm', reasoning_note: 'Agreed', student_visible: true },
    attempt: { id: 'a1', marks_earned: 2, ai_marking: attempt.ai_marking },
    teacherId: TEACHER,
    classroomId: CLASS,
    earliestOriginal: null,
    previousId: null,
  })
  assert.equal(w.attemptUpdate, null, 'confirm never touches attempts')
  assert.equal(w.marksEarnedAfter, 2)
  assert.deepEqual(w.row, {
    attempt_id: 'a1',
    teacher_id: TEACHER,
    classroom_id: CLASS,
    decision: 'confirm',
    original_marks_awarded: stored,
    override_marks_awarded: stored,
    override_total_earned: 2,
    reasoning_note: 'Agreed',
    student_visible: true,
    supersedes_override_id: null,
  })
}

{
  // A flag: private, attempts untouched, chained to the previous decision.
  const w = buildDecisionWrite({
    decision: accept({ decision: 'flag', reasoning_note: 'look again' }),
    attempt: { id: 'a1', marks_earned: '2', ai_marking: attempt.ai_marking },
    teacherId: TEACHER,
    classroomId: null,
    earliestOriginal: stored,
    previousId: PREV,
  })
  assert.equal(w.attemptUpdate, null)
  assert.equal(w.row.student_visible, false)
  assert.equal(w.row.supersedes_override_id, PREV)
  assert.equal(w.row.override_total_earned, 2)
  assert.throws(() =>
    buildDecisionWrite({
      decision: { decision: 'confirm', reasoning_note: null, student_visible: true },
      attempt: { id: 'a1', marks_earned: null, ai_marking: {} },
      teacherId: TEACHER,
      classroomId: null,
      earliestOriginal: null,
      previousId: null,
    })
  )
}

// A first override: the new marks and total on the attempt, the marker's result kept beside them.
const firstOverride = accept({
  decision: 'override',
  override_total_earned: 3,
  override_marks_awarded: echo([true, true, true]),
  reasoning_note: 'Sign is fine.',
})
const w1 = buildDecisionWrite({
  decision: firstOverride,
  attempt: { id: 'a1', marks_earned: 2, ai_marking: attempt.ai_marking },
  teacherId: TEACHER,
  classroomId: CLASS,
  earliestOriginal: null,
  previousId: null,
})
{
  assert.ok(w1.attemptUpdate)
  const ai = w1.attemptUpdate.ai_marking
  assert.equal(w1.attemptUpdate.marks_earned, 3)
  assert.equal(w1.marksEarnedAfter, 3)
  assert.equal(ai.summary, 'Mostly right.', 'the rest of ai_marking is kept')
  assert.equal(ai.teacher_override, true)
  assert.equal(ai.teacher_decision, 'override')
  assert.equal(ai.teacher_notes, 'Sign is fine.')
  assert.deepEqual(ai.original_marks_awarded, stored, 'the marker result is persisted on the first override')
  assert.equal(ai.original_marks_earned, 2, "and the marker's total")
  assert.deepEqual(
    (ai.marks_awarded as Array<{ earned: boolean }>).map((m) => m.earned),
    [true, true, true]
  )
  assert.deepEqual(w1.row.original_marks_awarded, stored)
  assert.deepEqual(w1.row.override_marks_awarded, ai.marks_awarded)
  assert.equal(w1.row.override_total_earned, 3)
}

// A second override keeps the FIRST AI snapshot — not the first teacher's marks.
{
  const afterFirst = { ...(w1.attemptUpdate!.ai_marking as Record<string, unknown>) }
  const second = accept(
    { decision: 'override', override_total_earned: 1, override_marks_awarded: echo([true, false, false]), student_visible: false, reasoning_note: 'private' },
    { marks_earned: 3, total_marks: 3, ai_marking: afterFirst }
  )
  const w2 = buildDecisionWrite({
    decision: second,
    attempt: { id: 'a1', marks_earned: 3, ai_marking: afterFirst },
    teacherId: TEACHER,
    classroomId: CLASS,
    earliestOriginal: w1.row.original_marks_awarded,
    previousId: PREV,
  })
  assert.deepEqual(w2.row.original_marks_awarded, stored, 'the snapshot is the marker, not the first teacher')
  assert.equal(w2.row.supersedes_override_id, PREV)
  const ai = w2.attemptUpdate!.ai_marking
  assert.deepEqual(ai.original_marks_awarded, stored, 'the persisted snapshot is never rewritten')
  assert.equal(ai.original_marks_earned, 2, "the marker's total is never replaced by a teacher's")
  assert.equal('teacher_notes' in ai, false, 'a private override leaves no note in the student-facing marking')
  assert.equal(w2.attemptUpdate!.marks_earned, 1)

  // Confirming after an override: the row's marks are the ones it stands on.
  const w3 = buildDecisionWrite({
    decision: { decision: 'confirm', reasoning_note: null, student_visible: true },
    attempt: { id: 'a1', marks_earned: 1, ai_marking: ai },
    teacherId: TEACHER,
    classroomId: CLASS,
    earliestOriginal: stored,
    previousId: PREV,
  })
  assert.deepEqual(w3.row.original_marks_awarded, stored)
  assert.deepEqual(w3.row.override_marks_awarded, ai.marks_awarded)
  assert.equal(w3.row.override_total_earned, 1)
}

// Overridden before the snapshot existed (legacy): the earliest row is the AI, and no total is guessed.
{
  const legacyAi = { marks_awarded: [{ ...stored[0], earned: false, teacher_override: true }], teacher_override: true }
  const w = buildDecisionWrite({
    decision: { decision: 'override', override_total_earned: 1, marks: null, reasoning_note: null, student_visible: true },
    attempt: { id: 'a1', marks_earned: 0, ai_marking: legacyAi },
    teacherId: TEACHER,
    classroomId: null,
    earliestOriginal: [stored[0]],
    previousId: PREV,
  })
  assert.deepEqual(w.row.original_marks_awarded, [stored[0]])
  assert.deepEqual(w.attemptUpdate!.ai_marking.original_marks_awarded, [stored[0]])
  assert.equal('original_marks_earned' in w.attemptUpdate!.ai_marking, false)
}

// A total-only override leaves the per-mark list alone (absent stays absent).
{
  const banded = { band_result: { level: 3, marks_awarded: 6, marks_available: 9 } }
  const w = buildDecisionWrite({
    decision: accept({ decision: 'override', override_total_earned: 7 }, { marks_earned: 6, total_marks: 9, ai_marking: banded }),
    attempt: { id: 'a2', marks_earned: 6, ai_marking: banded },
    teacherId: TEACHER,
    classroomId: CLASS,
    earliestOriginal: null,
    previousId: null,
  })
  assert.deepEqual(w.row.override_marks_awarded, [])
  assert.equal('marks_awarded' in w.attemptUpdate!.ai_marking, false)
  assert.deepEqual(w.attemptUpdate!.ai_marking.band_result, banded.band_result)
  assert.equal(w.attemptUpdate!.marks_earned, 7)
  assert.equal(w.attemptUpdate!.ai_marking.original_marks_earned, 6)
}

// --- console helpers --------------------------------------------------------------------------------------

assert.equal(markKey(1), '1')
assert.equal(markKey(' A1 '), 'A1')
assert.equal(markKey(''), null)
assert.equal(markKey(Number.NaN), null)
assert.equal(markKey({}), null)

assert.equal(markCodeValue('M1'), 1)
assert.equal(markCodeValue('B2'), 2)
assert.equal(markCodeValue('DM1'), 1)
assert.equal(markCodeValue('A1 ft'), 1)
assert.equal(markCodeValue('SC'), null)
assert.equal(markCodeValue(3), null)

// Weights are only trusted if they reproduce the script's current mark.
assert.deepEqual(markWeights([{ type: 'M1', earned: true }, { type: 'B2', earned: true }, { type: 'A1', earned: false }], 3), [1, 2, 1])
assert.deepEqual(markWeights([{ type: 'M1', earned: true }, { type: 'B2', earned: true }], 2), [1, 1], 'one-per-entry when the codes do not add up')
assert.deepEqual(markWeights([{ type: 'point', earned: true }, { type: 'point', earned: false }], 1), [1, 1])
assert.equal(markWeights([{ type: 'M1', earned: true }], 4), null, 'neither adds up: the teacher types the total')
assert.equal(markWeights([], 0), null)
assert.equal(markWeights([{ type: 'M1', earned: true }], null), null)

assert.equal(suggestedTotal([true, true, false], [1, 2, 1], 9), 3)
assert.equal(suggestedTotal([true, true], [5, 5], 6), 6, 'clamped to the maximum')
assert.equal(suggestedTotal([true], null, 6), null)
assert.equal(suggestedTotal([true, false], [1], 6), null, 'misaligned weights are ignored')

assert.deepEqual(buildDecisionPayload({ decision: 'flag', note: '  later ', studentVisible: true, total: 3, marks: [{ mark_id: 1, earned: true }] }), {
  decision: 'flag',
  reasoning_note: 'later',
})
assert.deepEqual(buildDecisionPayload({ decision: 'confirm', note: '   ', studentVisible: false }), {
  decision: 'confirm',
  student_visible: false,
})
assert.deepEqual(
  buildDecisionPayload({
    decision: 'override',
    note: '',
    studentVisible: true,
    total: 2,
    marks: [{ mark_id: 1, earned: true, reasoning: 'never sent' } as { mark_id: number; earned: boolean }],
  }),
  { decision: 'override', student_visible: true, override_total_earned: 2, override_marks_awarded: [{ mark_id: 1, earned: true }] }
)
assert.deepEqual(buildDecisionPayload({ decision: 'override', note: '', studentVisible: true, total: 5, marks: null }), {
  decision: 'override',
  student_visible: true,
  override_total_earned: 5,
})
// The console's payload passes the validator it mirrors.
assert.equal(
  accept(buildDecisionPayload({ decision: 'override', note: 'ok', studentVisible: true, total: 1, marks: echo([true, false, false]) })).decision,
  'override'
)

assert.deepEqual(decisionFieldTarget('override_total_earned'), { part: 'total', markIndex: null })
assert.deepEqual(decisionFieldTarget('override_marks_awarded[3].earned'), { part: 'marks', markIndex: 3 })
assert.deepEqual(decisionFieldTarget('override_marks_awarded'), { part: 'marks', markIndex: null })
assert.deepEqual(decisionFieldTarget('reasoning_note'), { part: 'note', markIndex: null })
assert.deepEqual(decisionFieldTarget('student_visible'), { part: 'visible', markIndex: null })
assert.deepEqual(decisionFieldTarget('decision'), { part: 'decision', markIndex: null })
assert.deepEqual(decisionFieldTarget(undefined), { part: 'other', markIndex: null })

assert.equal(describeReviewFailure(400, { error: 'The total must be between 0 and 9.' }), 'Not saved — the total must be between 0 and 9.')
assert.match(describeReviewFailure(401, {}), /session has expired/)
assert.match(describeReviewFailure(403, {}), /teacher account/)
assert.match(describeReviewFailure(404, { error: 'Attempt not found' }), /no longer on your desk/)
assert.match(describeReviewFailure(500, { error: 'Could not save the decision. Try again.' }), /^Not saved — could not save the decision/)
assert.match(describeReviewFailure(502, null), /something went wrong/)
assert.deepEqual(DECISION_STAMP, { confirm: 'OK', override: 'OV', flag: 'FLG' })

console.log('override-validate.test.ts — all assertions passed')
