import {
  buildParentReport,
  MIN_ATTEMPTS_FOR_AVERAGE,
  RECENT_WINDOW_DAYS,
  type ParentReportProfile,
} from './parent-report'
import type { AttemptWithPaper } from '@/lib/syllabi/attempts'

let failed = 0
function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const NOW = new Date('2026-09-02T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * DAY).toISOString()
}

let seq = 0
function attempt(
  opts: {
    earned?: number
    total?: number
    daysAgo?: number
    paper?: string | null
    tags?: string[] | null
  } = {}
): AttemptWithPaper {
  seq += 1
  return {
    id: `a${seq}`,
    marks_earned: opts.earned ?? 6,
    total_marks: opts.total ?? 10,
    syllabus_tags: (opts.tags ?? null) as AttemptWithPaper['syllabus_tags'],
    created_at: daysAgo(opts.daysAgo ?? 1),
    mark_schemes: opts.paper === null ? null : { paper_code: opts.paper ?? '9700/23' },
  } as AttemptWithPaper
}

const NO_PROFILE: ParentReportProfile = { target_grade: null, exam_date: null }
const asOf = { asOf: NOW }

// ── An empty account must not read as a bad one ──────────────────────────────
// This page is shown to a parent. "0%" and "grade U" are worse than silence,
// and the student who has marked nothing is exactly the one who would be hurt.
{
  const r = buildParentReport([], NO_PROFILE, asOf)
  check('no attempts, no marks', r.marksCompleted === 0)
  check('no average is invented', r.averagePercentage === null)
  check('no grade is invented', r.predictedGrade === null)
  check('no delta', r.averageDelta === null)
  check('no subjects', r.subjects.length === 0)
  check('no weak topics', r.weakTopics.length === 0)
  check('and it says so', r.hasEnoughForTrajectory === false)
  check('no first mark', r.firstMarkedAt === null)
  check('no last mark', r.lastMarkedAt === null)
  check('no active days', r.activeDaysRecent === 0)
}

// ── One or two questions is not a trend ──────────────────────────────────────
{
  const r = buildParentReport([attempt(), attempt()], NO_PROFILE, asOf)
  check('the effort still counts', r.marksCompleted === 2)
  check('the floor is 3', MIN_ATTEMPTS_FOR_AVERAGE === 3)
  check('but no average below the floor', r.averagePercentage === null)
  check('and no trajectory claim', r.hasEnoughForTrajectory === false)
}

// ── Effort figures ───────────────────────────────────────────────────────────
{
  const rows = [
    attempt({ daysAgo: 1 }),
    attempt({ daysAgo: 1 }), // same day — one active day, two marks
    attempt({ daysAgo: 4 }),
    attempt({ daysAgo: 9 }),
    attempt({ daysAgo: 200 }), // outside the window, still all-time work
  ]
  const r = buildParentReport(rows, NO_PROFILE, asOf)
  check('all-time count is every attempt', r.marksCompleted === 5)
  check('recent count excludes the old one', r.marksRecent === 4)
  check('two marks on one evening is one active day', r.activeDaysRecent === 3)
  check('the first mark is the oldest', r.firstMarkedAt === daysAgo(200))
  check('the last mark is the newest', r.lastMarkedAt === daysAgo(1))
  check('the window is 30 days', RECENT_WINDOW_DAYS === 30)
}

// ── A capped query must not understate the headline ─────────────────────────
// The route fetches at most 500 rows; the count a parent is shown has to be the
// real one. Ignored when it is smaller than what we actually hold, so a stale
// or wrong count can never subtract from visible work.
{
  const rows = [1, 2, 3].map((d) => attempt({ daysAgo: d }))
  check(
    'a true count overrides the page size',
    buildParentReport(rows, NO_PROFILE, { ...asOf, totalMarksCompleted: 812 })
      .marksCompleted === 812
  )
  check(
    'a smaller count is ignored',
    buildParentReport(rows, NO_PROFILE, { ...asOf, totalMarksCompleted: 1 })
      .marksCompleted === 3
  )
  check(
    'no count given falls back to the rows',
    buildParentReport(rows, NO_PROFILE, asOf).marksCompleted === 3
  )
}

// ── A windowed history must say so ──────────────────────────────────────────
// The route reads at most 500 rows but counts the total exactly. Left
// unstated, a report reads "800 questions" beside a subject list covering the
// last 500 — wrong in the direction that flatters us.
{
  const rows = [1, 2, 3].map((d) => attempt({ daysAgo: d }))
  const windowed = buildParentReport(rows, NO_PROFILE, {
    ...asOf,
    totalMarksCompleted: 812,
  })
  check('the headline is the true total', windowed.marksCompleted === 812)
  check('and the breakdown admits its window', windowed.detailIsWindowed === true)
  check('naming how many rows it saw', windowed.detailWindowSize === 3)

  const whole = buildParentReport(rows, NO_PROFILE, { ...asOf, totalMarksCompleted: 3 })
  check('nothing to disclose when the count matches', whole.detailIsWindowed === false)
  check('and no window size', whole.detailWindowSize === null)

  const uncounted = buildParentReport(rows, NO_PROFILE, asOf)
  check('no count given is not windowed', uncounted.detailIsWindowed === false)
}

// ── The start date must be the real one, not the oldest row that fitted ─────
{
  const rows = [1, 2, 3].map((d) => attempt({ daysAgo: d }))
  const r = buildParentReport(rows, NO_PROFILE, {
    ...asOf,
    totalMarksCompleted: 812,
    firstMarkedAt: daysAgo(400),
  })
  check('the supplied start date wins', r.firstMarkedAt === daysAgo(400))
  check('the last mark still comes from the rows', r.lastMarkedAt === daysAgo(1))
  check(
    'without one it falls back to the oldest row held',
    buildParentReport(rows, NO_PROFILE, asOf).firstMarkedAt === daysAgo(3)
  )
}

// ── The average is marks-weighted, not a mean of percentages ────────────────
// A 1-mark question answered wrong must not cost as much as a 20-mark essay.
{
  const rows = [
    attempt({ earned: 0, total: 1 }),
    attempt({ earned: 18, total: 20 }),
    attempt({ earned: 18, total: 20 }),
  ]
  const r = buildParentReport(rows, NO_PROFILE, asOf)
  // 36/41 = 87.8%. An unweighted mean would read 60%.
  check('weighted by marks available', r.averagePercentage === 88)
}

// ── Improvement is measured against the preceding window ────────────────────
{
  const recent = [1, 2, 3].map((d) => attempt({ daysAgo: d, earned: 8, total: 10 }))
  const older = [35, 40, 45].map((d) => attempt({ daysAgo: d, earned: 5, total: 10 }))
  const r = buildParentReport([...recent, ...older], NO_PROFILE, asOf)
  check('recent average is the recent window', r.averagePercentage === 80)
  check('the delta is against the window before it', r.averageDelta === 30)
}
{
  // Nothing to compare against is null, never zero — "no change" is a claim.
  const r = buildParentReport(
    [1, 2, 3].map((d) => attempt({ daysAgo: d })),
    NO_PROFILE,
    asOf
  )
  check('a first month has no delta', r.averageDelta === null)
}
{
  // A quiet month must not erase the standing the student already earned.
  const r = buildParentReport(
    [40, 41, 42].map((d) => attempt({ daysAgo: d, earned: 7, total: 10 })),
    NO_PROFILE,
    asOf
  )
  check('an all-time average survives a quiet month', r.averagePercentage === 70)
  check('with nothing recent to count', r.marksRecent === 0)
}

// ── Subjects, most-worked first ─────────────────────────────────────────────
{
  const rows = [
    ...[1, 2, 3].map(() => attempt({ paper: '9700/23' })),
    ...[1, 2, 3, 4].map(() => attempt({ paper: '9709/12' })),
    attempt({ paper: null, tags: null }), // unresolvable — counted, not bucketed
  ]
  const r = buildParentReport(rows, NO_PROFILE, asOf)
  check('two subjects resolved', r.subjects.length === 2)
  check('the most-worked leads', r.subjects[0].code === '9709')
  check('with its own count', r.subjects[0].marks === 4)
  check('the second follows', r.subjects[1].code === '9700')
  check('an unbucketable attempt still counts as effort', r.marksCompleted === 8)
  check('and the primary subject is the leader', r.primarySubjectLabel !== null)
}

// ── The target grade and the gap ────────────────────────────────────────────
{
  const rows = [1, 2, 3, 4, 5].map(() => attempt({ paper: '9709/12', earned: 6, total: 10 }))
  const r = buildParentReport(rows, { target_grade: 'A', exam_date: null }, asOf)
  check('the target is carried through', r.targetGrade === 'A')
  check('a gap is a positive number of points', (r.pointsToTarget ?? 0) > 0)
  check('and not marked on track', r.onTrackForTarget === false)
}
{
  const rows = [1, 2, 3, 4, 5].map(() => attempt({ paper: '9709/12', earned: 10, total: 10 }))
  const r = buildParentReport(rows, { target_grade: 'C', exam_date: null }, asOf)
  check('a met target is on track', r.onTrackForTarget === true)
  check('with nothing left to go', r.pointsToTarget === 0)
}
{
  // No target set (the common case — 0 of 105 users had one in July): the
  // report simply omits the trajectory rather than inventing a goal.
  const rows = [1, 2, 3, 4, 5].map(() => attempt({ paper: '9709/12' }))
  const r = buildParentReport(rows, NO_PROFILE, asOf)
  check('no target, no gap', r.pointsToTarget === null)
  check('no target, not on track', r.onTrackForTarget === false)
}

// ── IB is not on Cambridge letter boundaries ────────────────────────────────
// 'A1.1' is a real IB Biology syllabus code, so these attempts genuinely
// resolve to ib-biology-hl — without that the assertion below would pass for
// the wrong reason (no subject at all).
{
  const rows = [1, 2, 3, 4, 5].map(() =>
    attempt({ paper: null, tags: ['A1.1', 'A2.1'] })
  )
  const r = buildParentReport(rows, { target_grade: 'A', exam_date: null }, asOf)
  check('the IB subject resolved', r.subjects[0]?.code === 'ib-biology-hl')
  check('no letter grade is predicted for IB', r.predictedGrade === null)
  check('and no gap against a Cambridge target', r.pointsToTarget === null)
}

// ── The exam countdown ──────────────────────────────────────────────────────
{
  const future = new Date(NOW.getTime() + 45 * DAY).toISOString().slice(0, 10)
  const r = buildParentReport([attempt()], { target_grade: null, exam_date: future }, asOf)
  check('days left is counted', (r.examDaysLeft ?? 0) > 0)

  const past = new Date(NOW.getTime() - 45 * DAY).toISOString().slice(0, 10)
  const r2 = buildParentReport([attempt()], { target_grade: null, exam_date: past }, asOf)
  check('a passed exam date shows nothing', r2.examDaysLeft === null)
}

// ── Nothing personal leaves the account ─────────────────────────────────────
// A share link is a bearer credential; it ends up in a family group chat.
{
  const rows = [
    {
      ...attempt(),
      question_text: 'Explain why water is a polar molecule.',
      ocr_text: 'my handwritten answer',
    } as AttemptWithPaper,
  ]
  const r = buildParentReport(rows, NO_PROFILE, asOf)
  const serialized = JSON.stringify(r)
  check('no question text', !serialized.includes('polar molecule'))
  check('no answer text', !serialized.includes('handwritten'))
  check('no attempt ids', !serialized.includes('"a'.concat('1"')))
}

// ── Junk timestamps must not become NaN dates on the page ───────────────────
{
  const bad = { ...attempt(), created_at: 'not a date' } as AttemptWithPaper
  const r = buildParentReport([bad, attempt({ daysAgo: 2 })], NO_PROFILE, asOf)
  check('the undated attempt still counts as work', r.marksCompleted === 2)
  check('but never dates the report', r.firstMarkedAt === daysAgo(2))
  check('and never lands in an active day', r.activeDaysRecent === 1)
}

if (failed > 0) process.exit(1)
console.log('parent-report.test.ts: all checks passed')
