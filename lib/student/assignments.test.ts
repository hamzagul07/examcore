import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssignmentItem, AssignmentSubmission } from '@/lib/teacher/types'
import {
  CLASS_AVERAGE_MIN_STUDENTS,
  DUE_SOON_MS,
  buildStudentSetItems,
  canHandIn,
  clampDoneLimit,
  classAveragePct,
  classroomSubjectLabel,
  decodeDoneCursor,
  deriveStudentAssignment,
  encodeDoneCursor,
  exportableAuditDetails,
  formatMark,
  kindLabel,
  pctLabel,
  progressLabel,
  studentSetChip,
  loadAttemptTeacherNotes,
  loadStudentAssignment,
  loadStudentAssignments,
  MAX_FEEDBACK_READ_IDS,
  pageDoneSets,
  parseFeedbackReadBody,
  sortOpenSets,
  studentSubmissionStatus,
  summariseTeacherReview,
  visibleToStudent,
  type StudentSetRow,
} from '@/lib/student/assignments'

// The feature flag is on unless TEACHER_V2 is exactly '0'.
delete process.env.TEACHER_V2

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW = new Date('2026-10-05T12:00:00.000Z')
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString()

const SET_ID = '11111111-1111-4111-8111-111111111111'
const SET_B = '22222222-2222-4222-8222-222222222222'
const SET_C = '33333333-3333-4333-8333-333333333333'
const CLASS_ID = 'c0000000-0000-4000-8000-000000000001'
const TEACHER = 'a0000000-0000-4000-8000-00000000000a'
const ME = 'b0000000-0000-4000-8000-00000000000b'
const ITEM_1 = 'd0000000-0000-4000-8000-000000000001'
const ITEM_2 = 'd0000000-0000-4000-8000-000000000002'
const SCHEME_1 = 'e0000000-0000-4000-8000-000000000001'
const ATTEMPT_1 = 'f0000000-0000-4000-8000-000000000001'

function set(overrides: Partial<StudentSetRow> = {}): StudentSetRow {
  return {
    id: SET_ID,
    classroom_id: CLASS_ID,
    title: 'Vectors homework',
    kind: 'question_set',
    is_mock: false,
    due_at: at(3 * DAY),
    published_at: at(-2 * DAY),
    closed_at: null,
    archived_at: null,
    settings: {},
    ...overrides,
  }
}

function item(id: string, position: number, overrides: Partial<AssignmentItem> = {}): AssignmentItem {
  return {
    id,
    assignment_id: SET_ID,
    position,
    item_type: 'past_paper_question',
    mark_scheme_id: SCHEME_1,
    paper_code: '9709/12',
    paper_session: 'May/June 2024',
    question_number: String(position + 1),
    total_marks: 8,
    syllabus_tags: null,
    topic_code: null,
    prompt_text: null,
    ib_component_key: null,
    ...overrides,
  }
}

function submission(itemId: string, overrides: Partial<AssignmentSubmission> = {}): AssignmentSubmission {
  return {
    id: `sub-${itemId}`,
    assignment_id: SET_ID,
    item_id: itemId,
    student_id: ME,
    attempt_id: ATTEMPT_1,
    attempt_count: 1,
    marks_earned: 6,
    total_marks: 8,
    status: 'submitted',
    source: 'linked',
    first_submitted_at: at(-HOUR),
    last_submitted_at: at(-HOUR),
    ...overrides,
  }
}

const ITEMS = [item(ITEM_1, 0), item(ITEM_2, 1)]
const CLASSROOM = { id: CLASS_ID, name: '12B Maths' }

function view(opts: {
  set?: Partial<StudentSetRow>
  submissions?: AssignmentSubmission[]
  flags?: { excused_at?: string | null; extended_due_at?: string | null; feedback?: string | null } | null
  items?: AssignmentItem[]
  now?: Date
}) {
  return deriveStudentAssignment({
    set: set(opts.set),
    classroom: CLASSROOM,
    items: opts.items ?? ITEMS,
    submissions: opts.submissions ?? [],
    flags: opts.flags
      ? {
          excused_at: opts.flags.excused_at ?? null,
          extended_due_at: opts.flags.extended_due_at ?? null,
          feedback: opts.flags.feedback ?? null,
          feedback_at: null,
        }
      : null,
    now: opts.now ?? NOW,
  })
}

// --- state derivation ---------------------------------------------------------

{
  const v = view({})
  assert.equal(v.state, 'not_started')
  assert.equal(v.phase, 'open')
  assert.equal(v.items_total, 2)
  assert.equal(v.items_handed_in, 0)
  assert.equal(v.href, `/dashboard/assignments/${SET_ID}`)
  assert.equal(v.can_hand_in, true)
  assert.equal(v.due_soon, false, 'three days out is not "due soon"')
  assert.equal(v.overall_pct, null)
}

{
  const v = view({ submissions: [submission(ITEM_1)] })
  assert.equal(v.state, 'in_progress')
  assert.equal(v.phase, 'open')
  assert.equal(v.items_handed_in, 1)
  assert.equal(v.overall_pct, 75, 'own mark over the work handed in, not over the whole set')
}

{
  const v = view({ set: { due_at: at(DUE_SOON_MS - HOUR) } })
  assert.equal(v.due_soon, true, 'inside 48 hours')
  const past = view({ set: { due_at: at(-HOUR) } })
  assert.equal(past.state, 'overdue', 'past the deadline but inside the late window')
  assert.equal(past.phase, 'open', 'overdue work stays on the to-do list')
  assert.equal(past.due_soon, false)
  assert.equal(past.status, 'open')
  assert.equal(past.can_hand_in, true)
}

{
  const v = view({ submissions: [submission(ITEM_1), submission(ITEM_2, { marks_earned: 8 })] })
  assert.equal(v.state, 'complete')
  assert.equal(v.phase, 'done', 'finished work leaves the to-do list even while the set is open')
  assert.equal(v.is_late, false)
  assert.equal(v.overall_pct, 87.5)
}

{
  // Handed in after the deadline: complete, and late.
  const late = view({
    set: { due_at: at(-2 * DAY) },
    submissions: [
      submission(ITEM_1, { first_submitted_at: at(-DAY) }),
      submission(ITEM_2, { first_submitted_at: at(-3 * DAY) }),
    ],
  })
  assert.equal(late.state, 'complete')
  assert.equal(late.is_late, true)

  // The same hand-ins with an extension past them are on time: an extension
  // granted afterwards clears the late mark (lateness is derived, not stored).
  const extended = view({
    set: { due_at: at(-2 * DAY) },
    flags: { extended_due_at: at(-12 * HOUR) },
    submissions: [
      submission(ITEM_1, { first_submitted_at: at(-DAY) }),
      submission(ITEM_2, { first_submitted_at: at(-3 * DAY) }),
    ],
  })
  assert.equal(extended.is_late, false)
  assert.equal(extended.extended, true)
  assert.equal(extended.deadline, at(-12 * HOUR))
}

{
  // An extension only ever extends.
  const v = view({ flags: { extended_due_at: at(DAY) } })
  assert.equal(v.deadline, at(3 * DAY), 'an earlier "extension" does not shorten the deadline')
  assert.equal(v.extended, false)
  const moved = view({ set: { due_at: at(-HOUR) }, flags: { extended_due_at: at(DAY) } })
  assert.equal(moved.state, 'not_started', 'an extension past now means no longer overdue')
  assert.equal(moved.phase, 'open')
}

{
  const v = view({ flags: { excused_at: at(-DAY) } })
  assert.equal(v.state, 'excused')
  assert.equal(v.phase, 'done')
  assert.equal(v.can_hand_in, true, 'excused students may still hand the work in')
  const didItAnyway = view({
    flags: { excused_at: at(-DAY) },
    submissions: [submission(ITEM_1), submission(ITEM_2)],
  })
  assert.equal(didItAnyway.state, 'complete', 'work handed in outranks the excuse')
}

{
  // Closed by the teacher, nothing handed in.
  const v = view({ set: { closed_at: at(-HOUR) } })
  assert.equal(v.status, 'closed')
  assert.equal(v.state, 'missed')
  assert.equal(v.phase, 'done')
  assert.equal(v.can_hand_in, true, 'late work is accepted after close unless the teacher said otherwise')
  const strict = view({ set: { closed_at: at(-HOUR), settings: { allow_late: false } } })
  assert.equal(strict.can_hand_in, false)
  // Auto-closed seven days after the due date.
  const auto = view({ set: { due_at: at(-8 * DAY), published_at: at(-20 * DAY) } })
  assert.equal(auto.status, 'closed')
  assert.equal(auto.state, 'missed')
}

{
  // A ten-day extension on a set that refuses late work: day 8 is still open for this student.
  const strictSet = { due_at: at(-8 * DAY), published_at: at(-20 * DAY), settings: { allow_late: false } }
  const extended = view({ set: strictSet, flags: { extended_due_at: at(2 * DAY) } })
  assert.equal(extended.status, 'open', 'open for them until their own deadline')
  assert.notEqual(extended.state, 'missed', 'never "missed" before their deadline')
  assert.equal(extended.state, 'not_started')
  assert.equal(extended.can_hand_in, true, 'and the gate would take their work')
  assert.equal(extended.phase, 'open', 'it stays on their to-do list')
  assert.equal(canHandIn(set(strictSet), NOW, at(2 * DAY)), true)
  assert.equal(canHandIn(set(strictSet), NOW), false, 'without the extension the set is closed to late work')
  const manual = view({ set: { closed_at: at(-HOUR), settings: { allow_late: false } }, flags: { extended_due_at: at(5 * DAY) } })
  assert.equal(manual.status, 'open', 'a manual close does not take an extension back')
  const past = view({ set: strictSet, flags: { extended_due_at: at(-HOUR) } })
  assert.equal(past.state, 'missed', 'once the extension has passed, it is missed like any other')
  assert.equal(past.can_hand_in, false)
}

{
  assert.equal(canHandIn(set({ archived_at: at(-HOUR) }), NOW), false, 'a deleted set takes nothing')
  assert.equal(canHandIn(set({ published_at: null }), NOW), false)
  const empty = view({ items: [] })
  assert.equal(empty.state, 'not_started', 'a set with no items is never "complete"')
  const teacherNote = view({ flags: { feedback: '  Great start  ' } })
  assert.equal(teacherNote.has_teacher_note, true)
  assert.equal(view({ flags: { feedback: '   ' } }).has_teacher_note, false)
}

{
  // Rows for other sets are ignored.
  const other = submission(ITEM_1, { assignment_id: SET_B })
  assert.equal(view({ submissions: [other] }).items_handed_in, 0)
}

// --- labels ----------------------------------------------------------------------

{
  const chip = (overrides: Partial<Parameters<typeof studentSetChip>[0]>) =>
    studentSetChip({ state: 'not_started', is_late: false, due_soon: false, can_hand_in: true, ...overrides })
  assert.deepEqual(chip({}), { label: 'To do', tone: 'outline' })
  assert.deepEqual(chip({ due_soon: true }), { label: 'Due soon', tone: 'warn' })
  assert.deepEqual(chip({ state: 'in_progress' }), { label: 'Started', tone: 'outline' })
  assert.deepEqual(chip({ state: 'overdue' }), { label: 'Late', tone: 'no' })
  assert.deepEqual(chip({ state: 'complete' }), { label: 'Handed in', tone: 'ok' })
  assert.deepEqual(chip({ state: 'complete', is_late: true }), { label: 'Handed in late', tone: 'warn' })
  assert.deepEqual(chip({ state: 'excused' }), { label: 'Excused', tone: 'dim' })
  assert.deepEqual(chip({ state: 'missed' }), { label: 'Missed — late work accepted', tone: 'no' })
  assert.deepEqual(chip({ state: 'missed', can_hand_in: false }), { label: 'Missed', tone: 'no' })
  assert.equal(progressLabel({ items_total: 3, items_handed_in: 2 }), '2 of 3 handed in')
  assert.equal(progressLabel({ items_total: 1, items_handed_in: 0 }), 'Not handed in yet')
  assert.equal(progressLabel({ items_total: 1, items_handed_in: 1 }), 'Handed in')
  assert.equal(progressLabel({ items_total: 0, items_handed_in: 0 }), 'Nothing to hand in')
  assert.equal(pctLabel(87.5), '88%')
  assert.equal(pctLabel(null), null)
  assert.equal(kindLabel('whole_paper'), 'Whole paper')
  assert.equal(kindLabel('practice_prompt'), 'Practice question')
}

// --- which sets a student is shown ---------------------------------------------

{
  const joined = at(-DAY)
  assert.equal(visibleToStudent(set(), joined, false, NOW), true, 'open sets always show')
  const closedBeforeJoining = set({ due_at: at(-30 * DAY), published_at: at(-40 * DAY) })
  assert.equal(visibleToStudent(closedBeforeJoining, joined, false, NOW), false, 'could never have been done')
  assert.equal(
    visibleToStudent(closedBeforeJoining, joined, true, NOW),
    true,
    'unless they handed something in (a student who left and rejoined keeps their record)'
  )
  const closedAfterJoining = set({ closed_at: at(-HOUR), published_at: at(-10 * DAY) })
  assert.equal(visibleToStudent(closedAfterJoining, at(-5 * DAY), false, NOW), true, 'missed while a member')
  assert.equal(visibleToStudent(set({ archived_at: at(-HOUR) }), joined, true, NOW), false)
  assert.equal(
    visibleToStudent(closedBeforeJoining, joined, false, NOW, at(DAY)),
    true,
    'closed for the class before they joined, but open to them through an extension'
  )
}

// --- ordering and paging ------------------------------------------------------

{
  const a = { id: SET_ID, deadline: at(2 * DAY), published_at: at(-DAY) }
  const b = { id: SET_B, deadline: at(DAY), published_at: at(-DAY) }
  const c = { id: SET_C, deadline: null, published_at: at(-HOUR) }
  assert.deepEqual(
    sortOpenSets([a, c, b]).map((x) => x.id),
    [SET_B, SET_ID, SET_C],
    'soonest deadline first, undated last'
  )

  const done = [a, b, c]
  const first = pageDoneSets(done, null, 2)
  assert.deepEqual(first.page.map((x) => x.id), [SET_ID, SET_B], 'most recent deadline first')
  assert.ok(first.next_cursor)
  const cursor = decodeDoneCursor(first.next_cursor)
  assert.ok(cursor)
  const second = pageDoneSets(done, cursor, 2)
  assert.deepEqual(second.page.map((x) => x.id), [SET_C])
  assert.equal(second.next_cursor, null, 'last page')

  assert.equal(encodeDoneCursor({ key: 1700000000000, id: SET_ID.toUpperCase() }), `1700000000000.${SET_ID}`)
  for (const bad of ['', 'x', '12.not-a-uuid', `abc.${SET_ID}`, `1.${SET_ID}.extra`, '9'.repeat(80), null, undefined]) {
    assert.equal(decodeDoneCursor(bad as string | null | undefined), null, `rejects ${String(bad)}`)
  }
  assert.equal(clampDoneLimit(undefined), 20)
  assert.equal(clampDoneLimit('500'), 50)
  assert.equal(clampDoneLimit('0'), 20)
  assert.equal(clampDoneLimit('7'), 7)
}

// --- the set page's rows --------------------------------------------------------

{
  const prompt = item(ITEM_2, 1, {
    item_type: 'prompt',
    mark_scheme_id: null,
    paper_code: null,
    paper_session: null,
    question_number: null,
    prompt_text: 'Explain why $x^2 \\ge 0$.',
    total_marks: 4,
  })
  const rows = buildStudentSetItems({
    set: { id: SET_ID, title: 'Vectors homework', subject_code: '9709', due_at: at(3 * DAY) },
    items: [prompt, item(ITEM_1, 0)],
    submissions: [
      submission(ITEM_1, { marks_earned: 5, attempt_id: 'f0000000-0000-4000-8000-000000000009' }),
      submission(ITEM_1, { id: 'dup', marks_earned: 7, status: 'reviewed' }),
    ],
    flags: null,
    canHandIn: true,
    previews: new Map([[SCHEME_1, 'Find the angle between…']]),
    visibleReviews: new Set([ATTEMPT_1]),
  })
  assert.deepEqual(rows.map((r) => r.number), [1, 2], 'numbered in position order')
  assert.equal(rows[0].id, ITEM_1)
  assert.equal(rows[0].reference, '9709/12 · May/June 2024 · Q1')
  assert.equal(rows[0].preview, 'Find the angle between…')
  assert.equal(rows[0].state, 'reviewed', 'the teacher reviewed the counted hand-in')
  assert.equal(rows[0].submission?.marks_earned, 7, 'best mark counts')
  assert.equal(rows[0].attempt_href, `/dashboard/attempt/${ATTEMPT_1}`)
  assert.match(rows[0].mark_href ?? '', /^\/mark\?/)
  assert.match(rows[0].mark_href ?? '', new RegExp(`assignment=${ITEM_1}`), 'the mark link carries the item')
  assert.equal(rows[1].reference, null)
  assert.equal(rows[1].preview, 'Explain why $x^2 \\ge 0$.')
  assert.equal(rows[1].state, 'missing')
  assert.equal(rows[1].submission, null)
  assert.equal(rows[1].attempt_href, null)

  const closed = buildStudentSetItems({
    set: { id: SET_ID, title: 'Vectors homework', subject_code: '9709', due_at: at(3 * DAY) },
    items: [item(ITEM_1, 0)],
    submissions: [],
    flags: null,
    canHandIn: false,
  })
  assert.equal(closed[0].mark_href, null, 'no "Mark this" once the set stops taking work')

  // A decision the teacher kept private never shows as "Reviewed by your teacher".
  const privateReview = (subs: AssignmentSubmission[], visibleReviews?: Set<string>) =>
    buildStudentSetItems({
      set: { id: SET_ID, title: 'Vectors homework', subject_code: '9709', due_at: at(-2 * HOUR) },
      items: [item(ITEM_1, 0)],
      submissions: subs,
      flags: null,
      canHandIn: true,
      visibleReviews,
    })[0]
  const hidden = privateReview([submission(ITEM_1, { status: 'reviewed', first_submitted_at: at(-3 * HOUR) })], new Set())
  assert.equal(hidden.state, 'done', 'private confirm: shown as handed in')
  assert.equal(hidden.submission?.status, 'submitted', 'and the status field does not leak it either')
  const hiddenLate = privateReview([submission(ITEM_1, { status: 'reviewed', first_submitted_at: at(-HOUR) })])
  assert.equal(hiddenLate.state, 'late', 'private review of late work: late (no visible reviews known)')
  assert.equal(hiddenLate.submission?.status, 'late')
  const shown = privateReview([submission(ITEM_1, { status: 'reviewed' })], new Set([ATTEMPT_1]))
  assert.equal(shown.state, 'reviewed', 'a visible confirm or re-mark is shown')
  const otherAttempt = privateReview(
    [submission(ITEM_1, { status: 'reviewed', first_submitted_at: at(-3 * HOUR) })],
    new Set(['someone-else'])
  )
  assert.equal(otherAttempt.state, 'done', 'a visible review of another attempt does not count')

  assert.equal(
    studentSubmissionStatus({ status: 'late', attempt_id: ATTEMPT_1, first_submitted_at: at(-HOUR) }, null, at(-2 * HOUR), null),
    'late',
    'only "reviewed" is ever rewritten'
  )
  assert.equal(
    studentSubmissionStatus({ status: 'reviewed', attempt_id: null, first_submitted_at: at(-HOUR) }, new Set([ATTEMPT_1]), at(-2 * HOUR), at(DAY)),
    'submitted',
    'an attempt that no longer exists has no visible review; the extension makes it on time'
  )
}

// --- class average: only when allowed, only as an aggregate of enough students ---

{
  const items = [{ id: ITEM_1, total_marks: 10 }]
  const subs = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      student_id: `student-${i}`,
      item_id: ITEM_1,
      marks_earned: i * 2,
      total_marks: 10,
    }))
  assert.equal(classAveragePct({ settings: {}, items, submissions: subs(10) }), null, 'off by default')
  assert.equal(
    classAveragePct({ settings: { student_can_see_class_avg: false }, items, submissions: subs(10) }),
    null
  )
  assert.equal(
    classAveragePct({ settings: { student_can_see_class_avg: true }, items, submissions: subs(CLASS_AVERAGE_MIN_STUDENTS - 1) }),
    null,
    'too few students: an average would reveal a classmate'
  )
  assert.deepEqual(
    classAveragePct({ settings: { student_can_see_class_avg: true }, items, submissions: subs(5) }),
    { pct: 40, n: 5 },
    '0,20,40,60,80 → 40'
  )
  // Best row per student and item; rows for other items and unusable marks ignored.
  const mixed = [
    ...subs(5),
    { student_id: 'student-0', item_id: ITEM_1, marks_earned: 10, total_marks: 10 },
    { student_id: 'student-9', item_id: 'not-in-set', marks_earned: 1, total_marks: 10 },
    { student_id: 'student-8', item_id: ITEM_1, marks_earned: null, total_marks: 10 },
  ]
  assert.deepEqual(classAveragePct({ settings: { student_can_see_class_avg: true }, items, submissions: mixed }), {
    pct: 60,
    n: 5,
  })
}

// --- the teacher's review as the attempt page reads it --------------------------

{
  const row = (decision: 'confirm' | 'override' | 'flag' | null, minutes: number, note: string | null = null) => ({
    decision,
    created_at: at(minutes * 60_000),
    teacher_id: TEACHER,
    reasoning_note: note,
    teacher_notes: null,
  })
  assert.equal(summariseTeacherReview({ rows: [], originalMarks: 6, currentMarks: 6, totalMarks: 9 }), null)
  assert.equal(
    summariseTeacherReview({ rows: [row('flag', 1)], originalMarks: 6, currentMarks: 6, totalMarks: 9 }),
    null,
    'a flag is the teacher’s private note-to-self'
  )

  const remarked = summariseTeacherReview({
    rows: [row('override', 1, 'Method mark for the diagram.')],
    originalMarks: 6,
    currentMarks: 7,
    totalMarks: 9,
  })
  assert.equal(remarked?.headline, 'Re-marked by your teacher: 6 → 7')
  assert.equal(remarked?.stamp, 'OV')
  assert.equal(remarked?.detail, 'out of 9')
  assert.equal(remarked?.note, 'Method mark for the diagram.')

  const sameTotal = summariseTeacherReview({ rows: [row('override', 1)], originalMarks: 7, currentMarks: 7, totalMarks: 9 })
  assert.equal(sameTotal?.headline, 'Re-marked by your teacher')
  assert.equal(sameTotal?.detail, 'Now 7/9')

  const checked = summariseTeacherReview({ rows: [row('confirm', 1)], originalMarks: null, currentMarks: 6, totalMarks: 9 })
  assert.equal(checked?.kind, 'checked')
  assert.equal(checked?.stamp, 'OK')
  assert.equal(checked?.detail, '6/9 stands')

  // A confirm after an override: still a re-mark, and the latest note wins.
  const chain = summariseTeacherReview({
    rows: [row('confirm', 5, 'Checked again — it stands.'), row('override', 1, 'First pass.'), row('flag', 9, 'private')],
    originalMarks: 4,
    currentMarks: 5.5,
    totalMarks: 9,
  })
  assert.equal(chain?.headline, 'Re-marked by your teacher: 4 → 5.5')
  assert.equal(chain?.note, 'Checked again — it stands.')
  assert.equal(chain?.reviewed_at, at(5 * 60_000), 'the flag is not the latest visible decision')
  // Historic rows (decision null) were overrides.
  assert.equal(summariseTeacherReview({ rows: [row(null, 1)], originalMarks: 3, currentMarks: 4, totalMarks: 5 })?.stamp, 'OV')
  assert.equal(formatMark(7), '7')
  assert.equal(formatMark(6.25), '6.3')
}

// --- privacy export: audit details ----------------------------------------------

{
  const privateOverride = exportableAuditDetails('override', {
    attempt_id: ATTEMPT_1,
    decision: 'override',
    marks_before: 6,
    marks_after: 4,
    student_visible: false,
  })
  assert.deepEqual(privateOverride, { attempt_id: ATTEMPT_1 }, 'a private decision stays private')
  const shown = exportableAuditDetails('override', {
    attempt_id: ATTEMPT_1,
    decision: 'override',
    marks_before: 6,
    marks_after: 7,
    total_marks: 9,
    student_visible: true,
  })
  assert.deepEqual(shown, { attempt_id: ATTEMPT_1, decision: 'override', marks_before: 6, marks_after: 7, total_marks: 9 })
  assert.deepEqual(exportableAuditDetails('remove_student', { classroom_name: 'x', other: 1 }), {})
  assert.deepEqual(exportableAuditDetails('feedback', null), {})
  assert.deepEqual(exportableAuditDetails('feedback', ['a']), {})
}

// --- POST /api/feedback/read body ------------------------------------------------

{
  const ok = parseFeedbackReadBody({ ids: [ATTEMPT_1, ATTEMPT_1.toUpperCase(), ` ${SET_ID} `] })
  assert.deepEqual(ok, { ok: true, ids: [ATTEMPT_1, SET_ID] }, 'deduplicated, trimmed, lower-cased')
  for (const bad of [null, [], {}, { ids: [] }, { ids: 'x' }, { ids: ['x'] }, { ids: [1] }, { ids: [ATTEMPT_1, '%'] }]) {
    const res = parseFeedbackReadBody(bad)
    assert.equal(res.ok, false, `rejects ${JSON.stringify(bad)}`)
    assert.equal((res as { field: string }).field, 'ids')
  }
  const tooMany = Array.from({ length: MAX_FEEDBACK_READ_IDS + 1 }, () => ATTEMPT_1)
  assert.equal(parseFeedbackReadBody({ ids: tooMany }).ok, false)
}

// --- subject labels ---------------------------------------------------------------

assert.equal(classroomSubjectLabel({ subject_code: '9709', subject: 'Mathematics' }), 'Mathematics · 9709')
assert.equal(classroomSubjectLabel({ subject_code: null, subject: '  Further Maths ' }), 'Further Maths')
assert.equal(classroomSubjectLabel({ subject_code: null, subject: '' }), null)

// --- loaders against a fake PostgREST ----------------------------------------------

type Row = Record<string, unknown>
type Filter = { op: 'eq' | 'in' | 'is' | 'not-is'; col: string; value: unknown }

/**
 * Tables as arrays; eq / in / is / not-is filters are applied, or() and
 * order() are not (RLS and the query window are the database's job). Every
 * table read is logged so a test can assert what was NOT touched.
 */
function fakeDb(tables: Record<string, Row[]>, log: string[]): SupabaseClient {
  const client = {
    from(table: string) {
      log.push(table)
      const filters: Filter[] = []
      let fromIdx = 0
      let toIdx = Number.POSITIVE_INFINITY
      let single = false
      let cap = Number.POSITIVE_INFINITY
      const matches = (r: Row) =>
        filters.every((f) => {
          const v = r[f.col]
          if (f.op === 'eq') return v === f.value
          if (f.op === 'in') return (f.value as unknown[]).includes(v)
          if (f.op === 'is') return v === f.value || (f.value === null && v === undefined)
          return v !== null && v !== undefined
        })
      const chain: Record<string, unknown> = {}
      const self = () => chain
      Object.assign(chain, {
        select: self,
        order: self,
        or: self,
        eq: (col: string, value: unknown) => (filters.push({ op: 'eq', col, value }), chain),
        in: (col: string, value: unknown[]) => (filters.push({ op: 'in', col, value }), chain),
        is: (col: string, value: unknown) => (filters.push({ op: 'is', col, value }), chain),
        not: (col: string) => (filters.push({ op: 'not-is', col, value: null }), chain),
        range: (a: number, b: number) => ((fromIdx = a), (toIdx = b), chain),
        limit: (n: number) => ((cap = n), chain),
        maybeSingle: () => ((single = true), chain),
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
          const rows = (tables[table] ?? []).filter(matches).slice(fromIdx, toIdx + 1).slice(0, cap)
          return Promise.resolve(single ? { data: rows[0] ?? null, error: null } : { data: rows, error: null }).then(
            resolve,
            reject
          )
        },
      })
      return chain
    },
  }
  return client as unknown as SupabaseClient
}

async function main() {
  const setRow = (id: string, overrides: Row = {}): Row => ({
    id,
    classroom_id: CLASS_ID,
    title: `Set ${id.slice(0, 4)}`,
    kind: 'question_set',
    is_mock: false,
    due_at: at(3 * DAY),
    published_at: at(-2 * DAY),
    closed_at: null,
    archived_at: null,
    settings: {},
    instructions: 'Show every step.',
    subject_code: '9709',
    ...overrides,
  })
  const classroom = (settings: Row): Row => ({
    id: CLASS_ID,
    name: '12B Maths',
    teacher_id: TEACHER,
    subject: 'Mathematics',
    subject_code: '9709',
    level: 'A-Level',
    settings,
  })
  const others = Array.from({ length: 6 }, (_, i) => `90000000-0000-4000-8000-00000000000${i}`)
  const student = (tables: Record<string, Row[]>) => {
    const log: string[] = []
    return { db: fakeDb(tables, log), log }
  }

  const baseTables = (settings: Row) => ({
    assignments: [setRow(SET_ID)],
    classrooms: [classroom(settings)],
    classroom_memberships: [{ classroom_id: CLASS_ID, student_id: ME, joined_at: at(-5 * DAY), status: 'active' }],
    assignment_items: [item(ITEM_1, 0) as unknown as Row],
    assignment_submissions: [submission(ITEM_1) as unknown as Row],
    assignment_students: [
      { assignment_id: SET_ID, student_id: ME, excused_at: null, extended_due_at: null, feedback: 'Neat work.', feedback_at: at(-HOUR) },
    ],
    teacher_feedback: [
      { id: 'fb-1', attempt_id: ATTEMPT_1, student_id: ME, teacher_id: TEACHER, body: 'Label your axes.', created_at: at(-HOUR), read_at: null },
    ],
  })
  const adminTables = {
    user_profiles: [{ id: TEACHER, full_name: 'Amira Khan', teacher_verified_at: null }],
    mark_schemes: [{ id: SCHEME_1, question_text: 'Find the angle between the vectors.' }],
    assignment_submissions: [
      ...others.map((sid, i) => ({ id: `o${i}`, assignment_id: SET_ID, student_id: sid, item_id: ITEM_1, marks_earned: i, total_marks: 8 })),
      { id: 'me', assignment_id: SET_ID, student_id: ME, item_id: ITEM_1, marks_earned: 6, total_marks: 8 },
    ],
  }

  // Class average off (the default): the service client never reads anyone's hand-ins.
  {
    const s = student(baseTables({}))
    const adminLog: string[] = []
    const admin = fakeDb(adminTables, adminLog)
    const detail = await loadStudentAssignment(s.db, admin, ME, SET_ID, { now: NOW })
    assert.ok(detail)
    assert.equal(detail.class_average, null)
    assert.ok(!adminLog.includes('assignment_submissions'), 'no cohort read when the class does not allow the average')
    assert.equal(detail.classroom.teacher_display_name, 'Amira K.', 'teacher named by displayName only')
    assert.equal(detail.classroom.subject_label, 'Mathematics · 9709')
    assert.equal(detail.items[0].preview, 'Find the angle between the vectors.')
    assert.equal(detail.items[0].state, 'done')
    assert.equal(detail.flags?.feedback, 'Neat work.')
    assert.equal(detail.feedback.length, 1)
    assert.equal(detail.feedback[0].item_id, ITEM_1, 'a note is placed on the item it is about')
    assert.equal(detail.summary.state, 'complete')
    const json = JSON.stringify(detail)
    for (const other of others) assert.ok(!json.includes(other), 'no classmate id in the payload')
  }

  // Class average on: one aggregate, still no classmate data.
  {
    const s = student(baseTables({ student_can_see_class_avg: true }))
    const admin = fakeDb(adminTables, [])
    const detail = await loadStudentAssignment(s.db, admin, ME, SET_ID, { now: NOW })
    assert.ok(detail?.class_average)
    assert.equal(detail.class_average.n, 7)
    const json = JSON.stringify(detail)
    for (const other of others) assert.ok(!json.includes(other), 'aggregate only')
  }

  // Not visible (RLS returned nothing), malformed ids, a class they are no longer in.
  {
    const s = student({ ...baseTables({}), assignments: [] })
    assert.equal(await loadStudentAssignment(s.db, fakeDb(adminTables, []), ME, SET_ID, { now: NOW }), null)
    assert.equal(await loadStudentAssignment(s.db, fakeDb(adminTables, []), ME, 'not-a-uuid', { now: NOW }), null)
    const left = student({ ...baseTables({}), classroom_memberships: [] })
    assert.equal(await loadStudentAssignment(left.db, fakeDb(adminTables, []), ME, SET_ID, { now: NOW }), null)
  }

  // The list: open vs done, and a malformed cursor is the caller's error.
  {
    const tables = {
      ...baseTables({}),
      assignments: [
        setRow(SET_ID),
        setRow(SET_B, { due_at: at(DAY) }),
        setRow(SET_C, { closed_at: at(-HOUR), published_at: at(-3 * DAY) }),
      ],
      assignment_items: [
        item(ITEM_1, 0) as unknown as Row,
        { ...item('d0000000-0000-4000-8000-0000000000b1', 0), assignment_id: SET_B } as unknown as Row,
        { ...item('d0000000-0000-4000-8000-0000000000c1', 0), assignment_id: SET_C } as unknown as Row,
      ],
    }
    const s = student(tables)
    const list = await loadStudentAssignments(s.db, ME, { now: NOW })
    assert.deepEqual(list.open.map((a) => a.id), [SET_B], 'only unfinished open work is to do')
    assert.deepEqual(
      list.done.map((a) => [a.id, a.state]),
      [
        [SET_ID, 'complete'],
        [SET_C, 'missed'],
      ]
    )
    assert.equal(list.next_cursor, null)
    await assert.rejects(() => loadStudentAssignments(s.db, ME, { now: NOW, cursor: 'nope' }), /not valid/)
  }

  // Attempt notes: a private decision never shows, even if a policy let it through.
  {
    const tables = {
      teacher_overrides: [
        { attempt_id: ATTEMPT_1, decision: 'override', created_at: at(-HOUR), teacher_id: TEACHER, reasoning_note: 'hidden', teacher_notes: null, student_visible: false },
      ],
      teacher_feedback: [],
    }
    const s = student(tables)
    const none = await loadAttemptTeacherNotes(s.db, fakeDb(adminTables, []), {
      attemptId: ATTEMPT_1,
      userId: ME,
      marksEarned: 4,
      totalMarks: 8,
      aiMarking: { original_marks_earned: 6 },
    })
    assert.equal(none, null)

    const visible = student({
      teacher_overrides: [{ ...tables.teacher_overrides[0], student_visible: true, reasoning_note: 'Recounted.' }],
      teacher_feedback: [
        { id: 'fb-2', attempt_id: ATTEMPT_1, student_id: ME, teacher_id: TEACHER, body: 'See me.', created_at: at(-HOUR), read_at: null },
      ],
    })
    const notes = await loadAttemptTeacherNotes(visible.db, fakeDb(adminTables, []), {
      attemptId: ATTEMPT_1,
      userId: ME,
      marksEarned: 4,
      totalMarks: 8,
      aiMarking: { original_marks_earned: 6 },
    })
    assert.equal(notes?.review?.headline, 'Re-marked by your teacher: 6 → 4')
    assert.equal(notes?.review?.teacher_display_name, 'Amira K.')
    assert.equal(notes?.notes[0].body, 'See me.')
  }

  // Dark with the flag off.
  {
    process.env.TEACHER_V2 = '0'
    const s = student(baseTables({}))
    assert.deepEqual(await loadStudentAssignments(s.db, ME, { now: NOW }), { open: [], done: [], next_cursor: null })
    assert.equal(await loadStudentAssignment(s.db, fakeDb(adminTables, []), ME, SET_ID, { now: NOW }), null)
    assert.equal(s.log.length, 0, 'no reads at all')
    delete process.env.TEACHER_V2
  }

  console.log('lib/student/assignments.test.ts — all assertions passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
