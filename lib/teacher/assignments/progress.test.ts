import assert from 'node:assert/strict'
import {
  REMIND_COOLDOWN_MS,
  buildAssignmentProgress,
  buildItemGaps,
  owesWork,
  remindRetryAfterMs,
  studentsToRemind,
  type ProgressInput,
} from '@/lib/teacher/assignments/progress'
import type { GapAttempt } from '@/lib/teacher/cohort-gaps'
import type { AssignmentItem, AssignmentStudentFlags, AssignmentSubmission } from '@/lib/teacher/types'
import type { ClassroomMember } from '@/lib/teacher-analytics'

const SET = '00000000-0000-4000-8000-00000000a001'
const AMIRA = '00000000-0000-4000-8000-0000000000a1'
const BEN = '00000000-0000-4000-8000-0000000000b2'
const CHLOE = '00000000-0000-4000-8000-0000000000c3'
const DEV = '00000000-0000-4000-8000-0000000000d4'
const ELI = '00000000-0000-4000-8000-0000000000e5'

const items: AssignmentItem[] = [1, 0].map((position) => ({
  id: `00000000-0000-4000-8000-00000000d00${position}`,
  assignment_id: SET,
  position,
  item_type: 'past_paper_question',
  mark_scheme_id: `00000000-0000-4000-8000-00000000e00${position}`,
  paper_code: '9709/12',
  paper_session: 'May/June 2024',
  question_number: String(position + 1),
  total_marks: 10,
  syllabus_tags: null,
  topic_code: null,
  prompt_text: null,
  ib_component_key: null,
}))
const [Q2, Q1] = items // deliberately out of position order

const member = (student_id: string, over: Partial<ClassroomMember> = {}): ClassroomMember => ({
  student_id,
  status: 'active',
  joined_at: '2026-09-01T00:00:00.000Z',
  ...over,
})

const sub = (student_id: string, item: AssignmentItem, over: Partial<AssignmentSubmission> = {}): AssignmentSubmission => ({
  id: `${student_id}-${item.id}`,
  assignment_id: SET,
  item_id: item.id,
  student_id,
  attempt_id: `att-${student_id}-${item.position}`,
  attempt_count: 1,
  marks_earned: 8,
  total_marks: 10,
  status: 'submitted',
  source: 'linked',
  first_submitted_at: '2026-09-24T10:00:00.000Z',
  last_submitted_at: '2026-09-24T10:00:00.000Z',
  ...over,
})

const flag = (student_id: string, over: Partial<AssignmentStudentFlags> = {}): AssignmentStudentFlags => ({
  assignment_id: SET,
  student_id,
  excused_at: null,
  extended_due_at: null,
  feedback: null,
  feedback_at: null,
  reminded_at: null,
  ...over,
})

const input: ProgressInput = {
  assignment: { id: SET, target: 'all', published_at: '2026-09-21T08:00:00.000Z', due_at: '2026-09-25T16:00:00.000Z' },
  items,
  members: [
    member(AMIRA),
    member(BEN),
    member(CHLOE),
    member(DEV),
    // Left before the set was published and handed nothing in: not on it.
    member(ELI, { status: 'left', left_at: '2026-09-10T00:00:00.000Z' }),
  ],
  flags: [flag(CHLOE, { excused_at: '2026-09-22T00:00:00.000Z' }), flag(DEV, { feedback: 'See me' })],
  submissions: [
    sub(AMIRA, Q1),
    sub(AMIRA, Q2, { marks_earned: 6, first_submitted_at: '2026-09-26T10:00:00.000Z' }),
    sub(BEN, Q1, { marks_earned: 4 }),
  ],
  names: new Map([
    [AMIRA, 'Amira Khan'],
    [BEN, 'Ben Okafor'],
    [CHLOE, 'Chloé Martin'],
    [DEV, null],
    [ELI, 'Eli Stone'],
  ]),
}

const progress = buildAssignmentProgress(input)

assert.equal(progress.assignment_id, SET)
assert.equal(progress.total_students, 4, 'active members; someone who left before publication is not on the set')
assert.deepEqual(
  progress.students.map((s) => s.display_name),
  ['Amira K.', 'Ben O.', 'Chloé M.', 'Student'],
  'displayName only, sorted by name'
)
const amira = progress.students.find((s) => s.student_id === AMIRA)!
assert.deepEqual(
  amira.items.map((i) => i.item_id),
  [Q1.id, Q2.id],
  'cells in position order whatever order the items arrive in'
)
assert.deepEqual(amira.items.map((i) => i.state), ['done', 'late'], 'Q2 was handed in after the deadline')
assert.equal(amira.overall_pct, 70)
assert.equal(amira.is_late, true)
const ben = progress.students.find((s) => s.student_id === BEN)!
assert.deepEqual(ben.items.map((i) => i.state), ['done', 'missing'], 'part-way is still missing')
const chloe = progress.students.find((s) => s.student_id === CHLOE)!
assert.equal(chloe.excused, true)
assert.equal(progress.students.find((s) => s.student_id === DEV)!.feedback, 'See me')

assert.equal(progress.handed_in, 1)
assert.equal(progress.missing, 2, 'Ben (part-way) and Dev')
assert.equal(progress.excused, 1)
assert.equal(progress.late, 1)
assert.equal(progress.per_item[0].item_id, Q1.id)
assert.equal(progress.per_item[0].n, 2)
assert.equal(progress.per_item[0].mean_pct, 60)

{
  // A student who left AFTER the set went out stays on it, marked LEFT.
  const leftLater = buildAssignmentProgress({
    ...input,
    members: [...input.members.slice(0, 4), member(ELI, { status: 'left', left_at: '2026-09-23T00:00:00.000Z' })],
  })
  const eli = leftLater.students.find((s) => s.student_id === ELI)!
  assert.deepEqual(eli.items.map((i) => i.state), ['left', 'left'])
  assert.equal(leftLater.left, 1)
  assert.equal(owesWork(eli), false, 'nobody reminds a student who left')
}

{
  // Picked students only: the flags rows are the target list.
  const targeted = buildAssignmentProgress({
    ...input,
    assignment: { ...input.assignment, target: 'students' },
    flags: [flag(BEN), flag(DEV)],
  })
  assert.deepEqual(targeted.students.map((s) => s.student_id).sort(), [BEN, DEV].sort(), 'only the picked students')
}

{
  const empty = buildAssignmentProgress({ ...input, items: [], submissions: [] })
  assert.equal(empty.handed_in, 0, 'a set with no items has nothing handed in')
}

// --- remind ------------------------------------------------------------------------

assert.deepEqual(studentsToRemind(progress, null), { ids: [BEN, DEV].sort(), unknown: [] }, 'owing: not complete, not excused')
assert.deepEqual(studentsToRemind(progress, [AMIRA, BEN]), { ids: [BEN], unknown: [] }, 'a picked student who is done is skipped')
assert.deepEqual(studentsToRemind(progress, [ELI]), { ids: [], unknown: [ELI] }, 'a student not on the set is reported')
assert.deepEqual(studentsToRemind(progress, [CHLOE]), { ids: [], unknown: [] }, 'an excused student is not reminded')

const now = new Date('2026-09-25T12:00:00.000Z')
assert.equal(remindRetryAfterMs(null, now), 0, 'never reminded')
assert.equal(remindRetryAfterMs(new Date(now.getTime() - 60 * 60_000).toISOString(), now), REMIND_COOLDOWN_MS - 60 * 60_000)
assert.equal(remindRetryAfterMs(new Date(now.getTime() - REMIND_COOLDOWN_MS).toISOString(), now), 0, 'six hours on')
assert.equal(remindRetryAfterMs(new Date(now.getTime() + 60_000).toISOString(), now), REMIND_COOLDOWN_MS, 'a future stamp is "just now"')
assert.equal(remindRetryAfterMs('garbage', now), 0)

// --- item gaps ----------------------------------------------------------------------------

{
  const script = (user_id: string, earned: boolean[], note: string): GapAttempt => ({
    user_id,
    marks_earned: earned.filter(Boolean).length,
    total_marks: earned.length,
    ai_marking: {
      marks_awarded: earned.map((e, i) => ({ type: i === 0 ? 'M1' : 'A1', earned: e, margin_note: e ? null : note })),
    },
  })
  const attempts = new Map<string, GapAttempt>([
    [`att-${AMIRA}-0`, script(AMIRA, [true, false], 'Did not state the final answer')],
    [`att-${BEN}-0`, script(BEN, [true, false], 'Did not state the final answer')],
    [`att-${AMIRA}-1`, script(AMIRA, [false, false], 'Sign error in the expansion')],
  ])
  const gaps = buildItemGaps(items, progress, attempts)
  assert.deepEqual(gaps.map((g) => g.item_id), [Q1.id, Q2.id], 'in position order')
  assert.equal(gaps[0].mean_pct, 60, 'means come from progress, so they match the matrix')
  assert.deepEqual(gaps[0].attempt_ids.sort(), [`att-${AMIRA}-0`, `att-${BEN}-0`].sort(), 'Open N scripts')
  assert.equal(gaps[0].most_missed[0]?.note, 'Did not state the final answer')
  assert.equal(gaps[0].most_missed[0]?.students, 2)
  assert.equal(gaps[1].scripts, 1)
  assert.ok(gaps.every((g) => g.most_missed.length <= 3), 'top three only')
}

console.log('progress.test.ts: all checks passed')
