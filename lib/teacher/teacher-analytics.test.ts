import assert from 'node:assert/strict'
import {
  attemptInSubject,
  computeBlindspots,
  computeQuadrant,
  computeStudentQuadrants,
  computeTopicAnalytics,
  paceDivider,
  QUADRANT_ACCURACY_THRESHOLD,
  resolveAttemptSubject,
  scopeClassroomAttempts,
  subjectFromPaperCode,
  summarizeClassAnalytics,
  topicNameForCode,
  type ClassroomAttempt,
  type ClassroomMember,
} from '@/lib/teacher-analytics'
import { ACCURACY_THRESHOLD } from '@/lib/insights/speed-accuracy'
import { getTotalSyllabusLeaves } from '@/lib/syllabi'
import { NO_DATA } from '@/lib/teacher/stat-display'

// --- fixtures ------------------------------------------------------------------
//
// A Chemistry (9701) class. Amira and Ben are active; Cara left; Dev was
// removed. Several students also do Mathematics and Physics elsewhere, which
// is the case scoping exists for.

let seq = 0
function attempt(
  user: string,
  created: string,
  earned: number,
  total: number,
  tags: string[] | null,
  extra: Partial<ClassroomAttempt> = {}
): ClassroomAttempt {
  seq += 1
  return {
    id: `att-${seq}`,
    user_id: user,
    marks_earned: earned,
    total_marks: total,
    syllabus_tags: tags,
    created_at: created,
    time_spent_seconds: null,
    question_text: null,
    ai_marking: null,
    mark_schemes: null,
    ...extra,
  }
}

const member = (
  student_id: string,
  joined_at: string,
  status: ClassroomMember['status'] = 'active'
): ClassroomMember => ({ student_id, joined_at, status, left_at: null, removed_at: null })

const MEMBERS: ClassroomMember[] = [
  member('amira', '2026-09-01T09:00:00.000Z'),
  member('ben', '2026-09-10T09:00:00.000Z'),
  member('cara', '2026-09-01T09:00:00.000Z', 'left'),
  member('dev', '2026-09-01T09:00:00.000Z', 'removed'),
]

// --- which subject an attempt is in -------------------------------------------------

assert.equal(subjectFromPaperCode('9709/12'), '9709')
assert.equal(subjectFromPaperCode(' 9701/22 '), '9701', 'whitespace is not part of the code')
assert.equal(subjectFromPaperCode(''), null)
assert.equal(subjectFromPaperCode(null), null)
assert.equal(subjectFromPaperCode('/12'), null, 'a paper code with no syllabus part says nothing')

const scheme = (paper_code: string) => ({ paper_code, paper_session: 'm24', question_number: '3' })

// A banked question's paper code is definitive — even against its tags.
assert.deepEqual(
  resolveAttemptSubject(
    attempt('amira', '2026-09-20T10:00:00Z', 3, 5, ['37.1'], { mark_schemes: scheme('9709/12') }),
    '9701'
  ),
  { subject: '9709', basis: 'paper' }
)
// Whole-paper attempts carry the paper in ai_marking, not in a scheme row.
assert.deepEqual(
  resolveAttemptSubject(
    attempt('amira', '2026-09-20T10:00:00Z', 30, 60, null, { ai_marking: { paper_code: '9701/22' } }),
    '9709'
  ),
  { subject: '9701', basis: 'paper' }
)
// "37.1" exists only in 9701: tags alone decide it.
assert.deepEqual(resolveAttemptSubject(attempt('a', 'x', 1, 2, ['37.1']), '9709'), {
  subject: '9701',
  basis: 'tags',
})
// "23.1" is in both 9701 and 9702 — the class's own subject gets the benefit of the doubt…
assert.equal(resolveAttemptSubject(attempt('a', 'x', 1, 2, ['23.1']), '9701').subject, '9701')
assert.equal(resolveAttemptSubject(attempt('a', 'x', 1, 2, ['23.1']), '9702').subject, '9702')
// …but only when it is actually one of the candidates.
assert.equal(attemptInSubject(attempt('a', 'x', 1, 2, ['23.1']), '9709'), false)
// A maths question with codes that also exist in Chemistry: the question text breaks the tie.
const quadratic = attempt('amira', '2026-09-20T10:00:00Z', 2, 4, ['1.1', '1.2'], {
  question_text: 'Solve the quadratic equation 2x^2 - 3x - 5 = 0 by completing the square.',
})
assert.equal(resolveAttemptSubject(quadratic, '9701').subject, '9709', 'text cue names the tied subject')
assert.equal(attemptInSubject(quadratic, '9701'), false, 'so it stays out of the Chemistry class')
assert.equal(attemptInSubject(quadratic, '9709'), true)
// IB HL and SL share their codes; an HL class keeps HL/SL-shared work…
const ibShared = attempt('a', 'x', 3, 6, ['S1.1', 'R1.1'])
assert.equal(attemptInSubject(ibShared, 'ib-chemistry-hl'), true)
assert.equal(attemptInSubject(ibShared, 'ib-chemistry-sl'), true)
// …and an HL-only leaf is not SL work.
assert.equal(attemptInSubject(attempt('a', 'x', 3, 6, ['S1.1', 'R1.4']), 'ib-chemistry-sl'), false)
// Nothing to go on: unknown, so excluded from any subject-scoped class.
assert.deepEqual(resolveAttemptSubject(attempt('a', 'x', 1, 2, null), '9701'), { subject: null, basis: 'none' })
assert.deepEqual(resolveAttemptSubject(attempt('a', 'x', 1, 2, ['not-a-code']), '9701'), {
  subject: null,
  basis: 'none',
})

// --- the classroom privacy rule ---------------------------------------------------------

const chemistry = (user: string, created: string, earned = 3, total = 5) =>
  attempt(user, created, earned, total, ['37.1'])

const pool = [
  chemistry('amira', '2026-08-20T10:00:00.000Z'), // 0 before Amira joined
  chemistry('amira', '2026-09-02T10:00:00.000Z'), // 1 in scope
  chemistry('ben', '2026-09-10T09:00:00.000Z'), //   2 exactly at Ben's join: in
  chemistry('ben', '2026-09-10T08:59:59.999Z'), //   3 a millisecond before: out
  chemistry('cara', '2026-09-15T10:00:00.000Z'), //  4 Cara has left
  chemistry('dev', '2026-09-15T10:00:00.000Z'), //   5 Dev was removed
  chemistry('zed', '2026-09-15T10:00:00.000Z'), //   6 never a member
  attempt('amira', '2026-09-16T10:00:00.000Z', 4, 5, ['1.1'], { mark_schemes: scheme('9702/21') }), // 7 physics
  chemistry('amira', 'not a date'), //                8 unplaceable
]
const ids = (list: ClassroomAttempt[]) => list.map((a) => pool.indexOf(a))

assert.deepEqual(
  ids(scopeClassroomAttempts(pool, MEMBERS, { subjectCode: '9701' })),
  [1, 2],
  'active members, since joining, in the classroom subject — nothing else'
)
assert.deepEqual(
  ids(scopeClassroomAttempts(pool, MEMBERS, { subjectCode: '9701', sinceJoin: false })),
  [0, 1, 2, 3],
  'sinceJoin: false keeps earlier work of current members only'
)
assert.deepEqual(
  ids(scopeClassroomAttempts(pool, MEMBERS, { subjectCode: null })),
  [1, 2, 7],
  'a class with no subject set is not subject-filtered'
)
assert.deepEqual(
  ids(
    scopeClassroomAttempts(pool, MEMBERS, {
      subjectCode: '9701',
      since: '2026-09-05T00:00:00.000Z',
      until: '2026-09-12T00:00:00.000Z',
    })
  ),
  [2],
  'since / until bound the window'
)
assert.deepEqual(
  scopeClassroomAttempts(pool, [{ ...MEMBERS[0], joined_at: 'garbage' }], { subjectCode: '9701' }),
  [],
  'a member with no readable join date sees nothing (fails closed)'
)
assert.deepEqual(scopeClassroomAttempts(pool, [], { subjectCode: '9701' }), [], 'an empty class sees nothing')

// --- topics: generic over the registry -----------------------------------------------------

// 9701: "1.1" is a leaf; "1" is its parent section, not a leaf.
const chemAttempts = [
  attempt('amira', '2026-09-02T10:00:00Z', 1, 5, ['1.1']),
  attempt('ben', '2026-09-12T10:00:00Z', 2, 5, ['1.1', '1.1']), // duplicate tag counts once
  attempt('amira', '2026-09-03T10:00:00Z', 3, 10, ['1.1', '2.1']),
  attempt('ben', '2026-09-13T10:00:00Z', 9, 10, ['2.1']),
  attempt('amira', '2026-09-04T10:00:00Z', 5, 0, ['2.1']), // no usable total: not evidence
  attempt('amira', '2026-09-05T10:00:00Z', 4, 4, ['9.9.9', 'Q1']), // not 9701 leaves
]

const topics = computeTopicAnalytics(chemAttempts, '9701')
assert.equal(topics.length, getTotalSyllabusLeaves('9701'), 'one row per 9701 leaf — not 38 maths topics')
const t11 = topics.find((t) => t.code === '1.1')!
assert.equal(t11.name, 'Particles in the atom and atomic radius')
assert.equal(t11.parentCode, '1')
assert.equal(t11.classAttempts, 3)
assert.equal(t11.studentsAttempted, 2)
assert.equal(t11.avgMastery, (6 / 20) * 100, 'marks-weighted: (1+2+3)/(5+5+10)')
assert.equal(t11.level, 'critical', '30% on three attempts is a critical topic')
const t21 = topics.find((t) => t.code === '2.1')!
assert.equal(t21.classAttempts, 2, 'the zero-total attempt is skipped, not counted as 0%')
assert.equal(t21.avgMastery, 60)
assert.equal(t21.level, null, 'two attempts are a sample, not a level')
assert.equal(topics.find((t) => t.code === '3.1')!.avgMastery, null, 'untouched topics have no average')
assert.deepEqual(computeTopicAnalytics(chemAttempts, null), [], 'no subject, no topics')
assert.deepEqual(computeTopicAnalytics(chemAttempts, '0000'), [], 'a subject with no tree has no topics')

const maths = computeTopicAnalytics([], '9709')
assert.equal(maths.length, 38, '9709 still rolls up over its own 38 topics')

// --- blindspots: a Chemistry class gets real ones ---------------------------------------------

const blind = computeBlindspots(
  [
    ...chemAttempts,
    attempt('ben', '2026-09-14T10:00:00Z', 8, 10, ['3.1']),
    attempt('amira', '2026-09-14T10:00:00Z', 9, 10, ['3.1']),
    attempt('ben', '2026-09-15T10:00:00Z', 8, 10, ['3.1']),
    attempt('ben', '2026-09-15T10:00:00Z', 1, 10, ['4.1']),
    attempt('amira', '2026-09-15T10:00:00Z', 7, 10, ['4.1']),
    attempt('amira', '2026-09-16T10:00:00Z', 6, 10, ['4.1']),
  ],
  '9701'
)
assert.ok(blind.length > 0, 'tagged Chemistry work produces Chemistry blindspots')
assert.deepEqual(
  blind.map((b) => b.code),
  ['1.1', '4.1'],
  'weakest first; 3.1 at 83% is secure and 2.1 rests on two attempts'
)
assert.equal(blind[1].level, 'proficient', 'a shaky topic (40–75%) is still a blindspot')
assert.deepEqual(computeBlindspots([], '9701'), [], 'an empty class has no blindspots')

assert.equal(topicNameForCode('9701', '1.2'), 'Isotopes')
assert.equal(topicNameForCode('9701', 'zz'), 'zz', 'unknown codes are shown as themselves')
assert.equal(topicNameForCode(null, '1.2'), '1.2')

// --- quadrants ----------------------------------------------------------------------------

assert.equal(
  QUADRANT_ACCURACY_THRESHOLD,
  ACCURACY_THRESHOLD,
  "the teacher's matrix and the student's speed view draw \"accurate\" at the same line"
)
assert.equal(computeQuadrant(QUADRANT_ACCURACY_THRESHOLD, 1, 2), 'safe')
assert.equal(computeQuadrant(QUADRANT_ACCURACY_THRESHOLD - 0.1, 1, 2), 'careless_risk')
assert.equal(computeQuadrant(90, 3, 2), 'pacing_risk')
assert.equal(computeQuadrant(50, 1, 2), 'careless_risk')
assert.equal(computeQuadrant(50, 3, 2), 'under_prepared')
assert.equal(computeQuadrant(90, null, 2), 'safe', 'untimed: placed on accuracy alone')
assert.equal(computeQuadrant(50, null, 2), 'under_prepared', 'never called careless without a time')
assert.equal(computeQuadrant(50, 1, null), 'under_prepared', 'nobody timed: no divider')

assert.equal(paceDivider([]), null)
assert.equal(paceDivider([{ timePerMark: null }]), null)
assert.equal(
  paceDivider([{ timePerMark: 3 }, { timePerMark: 1 }, { timePerMark: null }]),
  null,
  'two timed students are not a class pace'
)
assert.equal(paceDivider([{ timePerMark: 3 }, { timePerMark: 1 }, { timePerMark: 2 }]), 2, 'median')
assert.equal(
  paceDivider([{ timePerMark: 4 }, { timePerMark: 1 }, { timePerMark: null }, { timePerMark: 2 }, { timePerMark: 3 }]),
  2.5,
  'even count: mean of the middle two; untimed ignored'
)

const timed = (user: string, earned: number, total: number, seconds: number | null, tags = ['1.1']) =>
  attempt(user, '2026-09-20T10:00:00Z', earned, total, tags, { time_spent_seconds: seconds })

const profiles = new Map([
  ['amira', { full_name: 'Amira Khan' }],
  ['ben', { full_name: '  ' }],
])
const quadrants = computeStudentQuadrants(
  [
    timed('amira', 9, 10, 600),
    timed('amira', 1, 2, 120),
    timed('amira', 1, 10, 600, ['2.1']),
    timed('amira', 2, 10, 600, ['2.1']),
    timed('amira', 3, 10, 600, ['2.1']),
    timed('ben', 3, 10, null),
    timed('ben', 8, 10, 0),
    timed('zed', 10, 10, 60), // not on the roster
  ],
  ['amira', 'ben', 'cara'],
  '9701',
  'Cambridge International',
  profiles
)
assert.deepEqual(
  quadrants.map((q) => q.studentId),
  ['amira', 'ben'],
  'Cara has no marked work, so no dot; Zed is not in the class'
)
const amira = quadrants[0]
assert.equal(amira.name, 'Amira Khan')
assert.equal(amira.attemptCount, 5)
assert.equal(amira.accuracy, (16 / 42) * 100, 'marks-weighted accuracy')
assert.equal(amira.timePerMark, (2520 / 60) / 42, 'minutes per available mark over timed attempts')
assert.equal(amira.coverage, (2 / getTotalSyllabusLeaves('9701')) * 100, 'coverage over the 9701 tree')
assert.deepEqual(
  amira.biggestDeficit,
  { code: '2.1', name: 'Relative masses of atoms and molecules', percentage: 20 },
  'the weakest leaf with three attempts behind it; 1.1 has only two'
)
assert.equal(amira.predictedGrade, 'E', 'letter grade on a Cambridge board (38%)')
const ben = quadrants[1]
assert.equal(ben.name, 'Student', 'a blank name falls back rather than printing nothing')
assert.equal(ben.timePerMark, null, 'no positive time: untimed, not "0 minutes a mark"')
assert.equal(ben.biggestDeficit, null, 'two attempts are not a deficit')
assert.equal(amira.quadrant, 'under_prepared', 'one timed student is no class pace: accuracy alone')
assert.equal(ben.quadrant, 'under_prepared', 'untimed and 55%')

// With a class pace: the slower half is "pacing", the faster half "careless".
const paced = computeStudentQuadrants(
  [
    timed('amira', 9, 10, 60 * 10), // 1 min/mark, 90%
    timed('ben', 9, 10, 60 * 30), //   3 min/mark, 90%
    timed('cara', 4, 10, 60 * 5), //   0.5 min/mark, 40%
    timed('dev', 4, 10, 60 * 40), //   4 min/mark, 40%
  ],
  ['amira', 'ben', 'cara', 'dev'],
  '9701',
  'Cambridge International'
)
assert.deepEqual(
  Object.fromEntries(paced.map((q) => [q.studentId, q.quadrant])),
  { amira: 'safe', ben: 'pacing_risk', cara: 'careless_risk', dev: 'under_prepared' },
  'divider is the median (2 min/mark)'
)

const ib = computeStudentQuadrants([timed('amira', 9, 10, 60, ['S1.1'])], ['amira'], 'ib-chemistry-hl', 'Cambridge International')
assert.equal(ib[0].predictedGrade, NO_DATA, 'an IB class never gets A*–E, whatever its board column says')
assert.equal(ib[0].name, 'Student', 'no profiles map: fallback name')
const ibBoard = computeStudentQuadrants([timed('amira', 9, 10, 60)], ['amira'], '9701', 'IB')
assert.equal(ibBoard[0].predictedGrade, NO_DATA)
const noTree = computeStudentQuadrants([timed('amira', 9, 10, 60)], ['amira'], null, 'Cambridge International')
assert.equal(noTree[0].coverage, null, 'no subject tree: coverage unknown, not 0%')
assert.deepEqual(computeStudentQuadrants([], [], '9701', 'Cambridge International'), [], 'empty class')

// --- class summary ----------------------------------------------------------------------------

const summary = summarizeClassAnalytics(
  [...chemAttempts, attempt('zed', '2026-09-20T10:00:00Z', 10, 10, ['1.1'])],
  ['amira', 'ben', 'cara'],
  '9701'
)
assert.equal(summary.subjectCode, '9701')
assert.equal(summary.studentCount, 3)
assert.equal(summary.studentsWithWork, 2)
assert.equal(summary.totalAttempts, 5, 'marked attempts only; zero-total and non-roster excluded')
assert.equal(summary.avgScore, (19 / 34) * 100, 'marks-weighted over the roster')
assert.equal(summary.coverage, (2 / getTotalSyllabusLeaves('9701')) * 100)
assert.equal(summary.topicAnalytics.find((t) => t.code === '1.1')!.classAttempts, 3, 'Zed is not counted')

const empty = summarizeClassAnalytics([], [], '9701')
assert.equal(empty.totalAttempts, 0)
assert.equal(empty.avgScore, null, 'no marked work: no average (never "0%")')
assert.equal(empty.coverage, 0)
const unset = summarizeClassAnalytics(chemAttempts, ['amira', 'ben'], null)
assert.equal(unset.coverage, null)
assert.deepEqual(unset.topicAnalytics, [])
assert.equal(unset.totalAttempts, 5, 'a class with no subject still has marked work to count')

console.log('teacher-analytics.test.ts: ok')
