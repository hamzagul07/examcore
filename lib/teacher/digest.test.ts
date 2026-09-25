import assert from 'node:assert/strict'
import {
  buildDigestClass,
  buildTeacherDigest,
  classHasNews,
  DIGEST_MAX_SETS_PER_CLASS,
  DIGEST_MIN_INTERVAL_MS,
  digestClaimCutoff,
  digestDue,
  digestWeekLabel,
  orderDigestCandidates,
  type DigestClass,
  type DigestClassInput,
} from '@/lib/teacher/digest'
import { parseIsoWeek } from '@/lib/teacher/week'
import type { AssignmentItem, AssignmentSubmission } from '@/lib/teacher/types'
import type { ClassroomAttempt, ClassroomMember } from '@/lib/teacher-analytics'
import type { ClassSet } from '@/lib/teacher-classroom-data'

const DAY = 86_400_000
// Sunday 27 Sep 2026, 16:00 UTC — when the cron runs. ISO week 2026-W39.
const NOW = new Date('2026-09-27T16:00:00Z')
const iso = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString()
const W39 = parseIsoWeek('2026-W39')!

// --- the guard: at most one digest a week, and never two from one Sunday -------------

assert.equal(digestDue(null, NOW), true, 'never sent')
assert.equal(digestDue(undefined, NOW), true)
assert.equal(digestDue('not a date', NOW), true, 'an unreadable stamp does not silence a teacher for ever')
assert.equal(digestDue(iso(-7), NOW), true, 'last Sunday')
assert.equal(digestDue(new Date(NOW.getTime() - DIGEST_MIN_INTERVAL_MS).toISOString(), NOW), true, 'exactly the interval')
assert.equal(digestDue(iso(-5), NOW), false, 'five days ago')
assert.equal(digestDue(new Date(NOW.getTime() - 60_000).toISOString(), NOW), false, 'a re-run of the same cron sends nothing')
assert.ok(DIGEST_MIN_INTERVAL_MS < 7 * DAY, 'a weekly cron that fires a little early is still due')
assert.equal(digestClaimCutoff(NOW), new Date(NOW.getTime() - DIGEST_MIN_INTERVAL_MS).toISOString())
// The claim cutoff and digestDue agree at the boundary, so a teacher the loop
// thinks is due can always be claimed, and one it thinks is not never is.
{
  const stamp = new Date(NOW.getTime() - DIGEST_MIN_INTERVAL_MS - 1).toISOString()
  assert.equal(digestDue(stamp, NOW), true)
  assert.ok(stamp < digestClaimCutoff(NOW))
}

assert.deepEqual(
  orderDigestCandidates([
    { id: 'b', teacher_digest_last_sent_at: iso(-7) },
    { id: 'c', teacher_digest_last_sent_at: null },
    { id: 'a', teacher_digest_last_sent_at: iso(-14) },
  ]).map((p) => p.id),
  ['c', 'a', 'b'],
  'never-sent first, then the longest-waiting — a run that runs out of time is fair'
)

// --- labels -------------------------------------------------------------------------------

assert.equal(digestWeekLabel(W39), '21–27 Sep 2026')
assert.equal(digestWeekLabel(parseIsoWeek('2026-W40')!), '28 Sep – 4 Oct 2026')
assert.equal(digestWeekLabel(parseIsoWeek('2026-W01')!), '29 Dec 2025 – 4 Jan 2026')

// --- content ------------------------------------------------------------------------------

const member = (student_id: string, joinedDaysAgo: number, over: Partial<ClassroomMember> = {}): ClassroomMember => ({
  student_id,
  status: 'active',
  joined_at: iso(-joinedDaysAgo),
  ...over,
})

const MEMBERS: ClassroomMember[] = [
  member('amira', 30),
  member('ben', 30),
  member('cara', 30, { status: 'left', left_at: iso(-5) }),
  member('dev', 3),
]
const NAMES = new Map<string, string | null>([
  ['amira', 'Amira Khan'],
  ['ben', 'Ben Okafor'],
  ['cara', 'Cara <b>Lee</b>'],
  ['dev', 'Dev Patel'],
])

const item = (id: string, assignment_id: string, position: number, total: number): AssignmentItem => ({
  id,
  assignment_id,
  position,
  item_type: 'past_paper_question',
  mark_scheme_id: `ms-${id}`,
  paper_code: '9709/12',
  paper_session: 'm/j/24',
  question_number: String(position + 1),
  total_marks: total,
  syllabus_tags: null,
  topic_code: null,
  prompt_text: null,
  ib_component_key: null,
})

const sub = (
  assignment_id: string,
  item_id: string,
  student_id: string,
  earned: number,
  total: number,
  firstDays: number
): AssignmentSubmission => ({
  id: `${assignment_id}-${item_id}-${student_id}`,
  assignment_id,
  item_id,
  student_id,
  attempt_id: `att-${item_id}-${student_id}`,
  attempt_count: 1,
  marks_earned: earned,
  total_marks: total,
  status: 'submitted',
  source: 'linked',
  first_submitted_at: iso(firstDays),
  last_submitted_at: iso(firstDays),
})

const setBase = {
  classroom_id: 'class-1',
  kind: 'question_set' as const,
  subject_code: '9709',
  is_mock: false,
  target: 'all' as const,
  closed_at: null,
  archived_at: null,
  flags: [],
}

// Completed this week (due Friday), with one late hand-in and one from a student who has since left.
const LAST: ClassSet = {
  ...setBase,
  id: 'last',
  title: 'Integration drill',
  published_at: iso(-10),
  due_at: iso(-2),
  created_at: iso(-10),
  items: [item('i1', 'last', 0, 5), item('i2', 'last', 1, 5)],
  submissions: [
    sub('last', 'i1', 'amira', 4, 5, -3),
    sub('last', 'i2', 'amira', 1, 5, -1), // after the deadline
    sub('last', 'i1', 'ben', 5, 5, -4),
    sub('last', 'i2', 'ben', 5, 5, -4),
    sub('last', 'i1', 'cara', 3, 5, -6),
  ],
}
// Due Wednesday.
const OPEN: ClassSet = {
  ...setBase,
  id: 'open',
  title: 'Vectors',
  published_at: iso(-1),
  due_at: iso(3),
  created_at: iso(-1),
  items: [item('o1', 'open', 0, 10)],
  submissions: [sub('open', 'o1', 'ben', 8, 10, -0.5)],
}
// Closed a month ago: not this week's news.
const OLD: ClassSet = {
  ...setBase,
  id: 'old',
  title: 'Old set',
  published_at: iso(-40),
  due_at: iso(-30),
  created_at: iso(-40),
  items: [item('x1', 'old', 0, 5)],
  submissions: [],
}

let seq = 0
const attempt = (user: string, days: number, paper = '9709/12'): ClassroomAttempt => ({
  id: `a${++seq}`,
  user_id: user,
  marks_earned: 3,
  total_marks: 5,
  syllabus_tags: null,
  created_at: iso(days),
  mark_schemes: { paper_code: paper, paper_session: 'm/j/24', question_number: '1' },
})

function marks(type: string, n: number, earned: number) {
  return Array.from({ length: n }, (_, i) => ({ type: `${type}${i + 1}`, earned: i < earned }))
}
const gapAttempt = (user: string, earned: number): ClassroomAttempt => ({
  ...attempt(user, -2),
  marks_earned: earned,
  total_marks: 6,
  ai_marking: { marks_awarded: marks('An', 6, earned) },
})

const input = (over: Partial<DigestClassInput> = {}): DigestClassInput => ({
  id: 'class-1',
  name: 'Year 13 Maths',
  subjectCode: '9709',
  members: MEMBERS,
  sets: [LAST, OPEN, OLD],
  names: NAMES,
  // Amira marked yesterday; Ben only in another subject; Dev joined three days ago.
  recentAttempts: [attempt('amira', -1), attempt('ben', -3, '9701/22')],
  gapAttempts: [gapAttempt('amira', 1), gapAttempt('ben', 2), gapAttempt('amira', 1)],
  unreviewed: 4,
  newHandIns: 6,
  week: W39,
  now: NOW,
  ...over,
})

const c = buildDigestClass(input())

assert.equal(c.name, 'Year 13 Maths')
assert.equal(c.subject_label, 'Mathematics · 9709')
assert.equal(c.members, 3, 'active members only')
assert.deepEqual(
  c.sets.map((s) => s.id),
  ['last', 'open'],
  "this week's sets, soonest deadline first; a set closed a month ago is left out"
)
assert.deepEqual(
  c.sets[0],
  {
    id: 'last',
    title: 'Integration drill',
    due_at: iso(-2),
    handed_in: 2,
    expected: 3,
    late: 1,
    mean_pct: 70,
  },
  'Amira and Ben handed in (Amira late); Dev still owes it; Cara left and owes nothing but her mark counts'
)
assert.deepEqual(
  { handed_in: c.sets[1].handed_in, expected: c.sets[1].expected, late: c.sets[1].late, mean: c.sets[1].mean_pct },
  { handed_in: 1, expected: 3, late: 0, mean: 80 },
  'a student who left before the set was published is not on it'
)
assert.equal(c.handed_in, 3)
assert.equal(c.expected, 6)
assert.equal(c.late, 1)
assert.equal(c.mean_pct, 72.5, 'every student percentage of the week counts once')
assert.equal(c.headline_gap, 'Analysis — 22% of marks earned', 'the set completed this week, so its gap is news')
assert.equal(c.unreviewed, 4)
assert.equal(c.new_hand_ins, 6)
assert.deepEqual(c.silent, ['Ben O.'], 'Ben marked only another subject; Dev is new; Cara left')
assert.equal(c.silent_count, 1)
assert.equal(c.more_sets, 0)
assert.equal(classHasNews(c), true)

// Names reach the email only as displayName(): no surnames, no markup.
for (const name of c.silent) assert.match(name, /^[\p{L}'’-]+( [\p{L}]\.)?$/u)

// A gap from a set that completed before this week is not reported.
{
  const nextWeek = buildDigestClass(
    input({ sets: [LAST], now: new Date(NOW.getTime() + 7 * DAY), week: parseIsoWeek('2026-W40')! })
  )
  assert.equal(nextWeek.headline_gap, null, "last week's set is not next week's news")
}

// Too little evidence: no headline rather than a guess.
{
  const thin = buildDigestClass(input({ gapAttempts: [gapAttempt('amira', 1)] }))
  assert.equal(thin.headline_gap, null)
}

// Only the first few sets are listed; the rest are counted.
{
  const many: ClassSet[] = Array.from({ length: DIGEST_MAX_SETS_PER_CLASS + 2 }, (_, i) => ({
    ...OPEN,
    id: `s${i}`,
    title: `Set ${i}`,
    due_at: iso(1 + i),
  }))
  const crowded = buildDigestClass(input({ sets: many }))
  assert.equal(crowded.sets.length, DIGEST_MAX_SETS_PER_CLASS)
  assert.equal(crowded.more_sets, 2)
  assert.equal(crowded.sets[0].id, 's0')
}

// --- which classes, in which order, and when there is nothing to send -----------------------

const quiet: DigestClass = {
  ...c,
  id: 'class-2',
  name: 'Quiet class',
  sets: [],
  more_sets: 0,
  handed_in: 0,
  expected: 0,
  late: 0,
  mean_pct: null,
  headline_gap: null,
  unreviewed: 0,
  new_hand_ins: 0,
  silent: [],
  silent_count: 0,
}
assert.equal(classHasNews(quiet), false)
assert.equal(classHasNews({ ...c, members: 0 }), false, 'a class with no students is never news')
assert.equal(buildTeacherDigest([quiet], W39), null, 'no digest rather than an empty one')

const calm: DigestClass = { ...quiet, id: 'class-3', name: 'Calm class', sets: c.sets.slice(1), new_hand_ins: 1 }
const digest = buildTeacherDigest([calm, quiet, c], W39)!
assert.ok(digest)
assert.equal(digest.week_key, '2026-W39')
assert.equal(digest.week_label, '21–27 Sep 2026')
assert.deepEqual(
  digest.classes.map((x) => x.id),
  ['class-1', 'class-3'],
  'the class that needs the teacher most first; the quiet class is dropped'
)
assert.deepEqual(digest.totals, { unreviewed: 4, late: 1, silent: 1, handed_in: 3, expected: 6 })

console.log('digest.test.ts — all assertions passed')
