/**
 * Classroom analytics — pure, subject-generic, classroom-scoped
 * (docs/TEACHER_SYSTEM_SPEC.md §2.4, §8).
 *
 * Every function here takes attempts that are ALREADY scoped to one class:
 * active members only, marked at or after the moment each joined, and in the
 * classroom's subject. lib/teacher-classroom-data.ts does that scoping when it
 * loads (getClassroomAttempts), using `scopeClassroomAttempts` below, so the
 * rule lives in one place and is tested without a database.
 *
 * Nothing here is specific to one syllabus. Topics, leaf names and the
 * coverage denominator come from lib/syllabi for the classroom's
 * `subject_code`; a class whose subject has no syllabus tree gets empty topic
 * lists and a null coverage rather than Mathematics' 38 topics. The single
 * source of "how weak is weak" is `levelFor` (lib/teacher/blindspots.ts).
 *
 * Percentages are marks-weighted everywhere (Σ earned / Σ available, as a
 * student's own mastery is): a 12-mark question counts for more than a 2-mark
 * one. Attempts with no usable total are not evidence and are skipped rather
 * than counted as 0%.
 */

import { predictGradeFromPercentage } from '@/lib/grade-boundaries'
import type { ErrorClassificationDetail } from '@/lib/error-classifications'
import {
  getSyllabusSubjectCodes,
  getSyllabusTopicByCode,
  getTotalSyllabusLeaves,
  getValidSyllabusCodes,
} from '@/lib/syllabi'
import { getAttemptSubjectCode } from '@/lib/syllabi/attempts'
import { usesLetterGradeBands } from '@/lib/target-grade'
import { isBlindspot, SECURE_FROM_PCT, type BlindspotLevel } from '@/lib/teacher/blindspots'
import {
  computeClassMastery,
  studentLeafLevel,
  usableMarks,
  type ClassMastery,
} from '@/lib/teacher/class-mastery'
import { DISPLAY_NAME_FALLBACK } from '@/lib/teacher/display-name'
import { NO_DATA } from '@/lib/teacher/stat-display'
import type { MembershipStatus } from '@/lib/teacher/types'

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** One mark-scheme point as stored in `ai_marking.marks_awarded[]`. */
export type ClassroomMarkPoint = {
  mark_id?: string | number | null
  type?: string | null
  earned?: boolean | null
  margin_note?: string | null
  error_classification?: string | null
  teacher_override?: boolean | null
}

/**
 * The analytics-relevant slice of `attempts.ai_marking`, not the whole
 * payload: the loader selects these JSON paths only, because the full column
 * carries page photos, OCR and ink for every script and a class read would
 * otherwise move megabytes nobody looks at. `marks_awarded` is present only
 * when the loader was asked for marking detail.
 */
export type ClassroomAiMarking = {
  marks_awarded?: ClassroomMarkPoint[] | null
  /** 'point_based' | 'level_of_response' | … ; absent on older rows. */
  marking_style?: string | null
  /** Whole-paper attempts record the paper here (no mark_scheme_id). */
  paper_code?: string | null
  paper_session?: string | null
  /** 'estimated' when the marker had to guess the question's total. */
  total_marks_source?: string | null
  guide_notice?: { status?: string | null } | null
  teacher_override?: boolean | null
  /**
   * Derived, not a stored key: true when the script carries a band_result
   * (level of response) or criteria_results (IB criteria) — a best-fit
   * judgement rather than a count of points.
   */
  judgement_marking?: boolean | null
}

export type ClassroomAttemptScheme = {
  paper_code: string | null
  paper_session: string | null
  question_number: string | null
}

export type ClassroomAttempt = {
  id: string
  user_id: string
  marks_earned: number
  total_marks: number
  syllabus_tags: string[] | null
  created_at: string
  time_spent_seconds?: number | null
  question_text?: string | null
  source_type?: string | null
  error_classifications?: ErrorClassificationDetail[] | null
  mark_scheme_id?: string | null
  assignment_item_id?: string | null
  ai_marking?: ClassroomAiMarking | null
  /**
   * The attempt's banked question, when the reading client can see
   * mark_schemes (the service client, or a scheme lookup — see
   * getClassroomAttempts). Null under a teacher's own RLS client.
   */
  mark_schemes?: ClassroomAttemptScheme | null
}

/** A classroom membership row, as the loaders read it. */
export type ClassroomMember = {
  student_id: string
  status: MembershipStatus
  joined_at: string
  left_at?: string | null
  removed_at?: string | null
}

export interface TopicAnalytics {
  code: string
  name: string
  paper: string
  /** The leaf's parent section in the syllabus tree. */
  parentCode: string
  /** Marked attempts tagged with this leaf. */
  classAttempts: number
  /** Marks-weighted class average 0–100; null when nobody has been marked on it. */
  avgMastery: number | null
  studentsAttempted: number
  /** `levelFor(avgMastery)` once MIN attempts back it; null before that. */
  level: BlindspotLevel | null
}

export type Quadrant = 'safe' | 'pacing_risk' | 'careless_risk' | 'under_prepared'

export interface StudentQuadrantMetric {
  studentId: string
  /** Full name for teacher UI (never for prompts or email — use displayName). */
  name: string
  /** Marks-weighted accuracy over the student's marked attempts, 0–100. */
  accuracy: number
  /**
   * Minutes per available mark over timed attempts; null when none of the
   * student's attempts carries a time. Plot these students as untimed —
   * never at a made-up pace.
   */
  timePerMark: number | null
  /** Share of the subject's syllabus leaves attempted, 0–100; null when the subject has no tree. */
  coverage: number | null
  /** A*–U on letter-graded boards, otherwise NO_DATA ('—'). */
  predictedGrade: string
  biggestDeficit: {
    code: string
    name: string
    percentage: number
  } | null
  quadrant: Quadrant
  /** Marked attempts behind these figures. */
  attemptCount: number
}

export type ClassSummary = {
  subjectCode: string | null
  /** Roster size (active members passed in). */
  studentCount: number
  /** Members with at least one marked attempt in scope. */
  studentsWithWork: number
  /** Marked attempts in scope — the evidence behind avgScore. */
  totalAttempts: number
  /** Marks-weighted class average 0–100; null exactly when totalAttempts is 0. */
  avgScore: number | null
  /** Share of the subject's leaves anyone in the class has been marked on. */
  coverage: number | null
  topicAnalytics: TopicAnalytics[]
}

// ---------------------------------------------------------------------------
// Which subject an attempt belongs to
// ---------------------------------------------------------------------------

export type SubjectBasis = 'paper' | 'tags' | 'text' | 'none'

/** `'9709/12'` → `'9709'`. Null for anything without a leading code. */
export function subjectFromPaperCode(paperCode: string | null | undefined): string | null {
  if (typeof paperCode !== 'string') return null
  const prefix = paperCode.split('/')[0]?.trim()
  return prefix ? prefix : null
}

let tagIndex: Map<string, string[]> | null = null

/** leaf code → every registry subject whose syllabus contains it. */
function subjectsForTag(tag: string): string[] {
  if (!tagIndex) {
    const index = new Map<string, string[]>()
    for (const subject of getSyllabusSubjectCodes()) {
      for (const code of getValidSyllabusCodes(subject)) {
        const list = index.get(code)
        if (list) list.push(subject)
        else index.set(code, [subject])
      }
    }
    tagIndex = index
  }
  return tagIndex.get(tag) ?? []
}

/** The subjects that explain the most of an attempt's tags (sorted), or []. */
function tagLeaders(tags: readonly string[] | null | undefined): string[] {
  if (!tags?.length) return []
  const votes = new Map<string, number>()
  for (const tag of new Set(tags.map((t) => (typeof t === 'string' ? t.trim() : '')))) {
    if (!tag) continue
    for (const subject of subjectsForTag(tag)) votes.set(subject, (votes.get(subject) ?? 0) + 1)
  }
  let top = 0
  for (const n of votes.values()) top = Math.max(top, n)
  if (top === 0) return []
  return [...votes.entries()]
    .filter(([, n]) => n === top)
    .map(([s]) => s)
    .sort()
}

/**
 * The subject an attempt was marked in, for classroom scoping.
 *
 * Attempts do not store a subject, so it is inferred, strongest evidence
 * first:
 *
 *   1. paper — the banked question's paper code (`9709/12` → 9709), or the
 *      whole-paper `ai_marking.paper_code`. Definitive.
 *   2. tags — syllabus tags are validated against the marking subject's
 *      syllabus when the attempt is marked, so a subject that explains more
 *      of the tags than any other is the one.
 *   3. When several subjects explain the tags equally (Cambridge leaf codes
 *      such as "1.1" exist in many syllabi; IB HL and SL share theirs), the
 *      question-text cue in lib/syllabi/attempts breaks the tie if it names
 *      one of them; otherwise the classroom's own subject gets the benefit of
 *      the doubt when it is among them. Without that, nearly all of a
 *      Chemistry class's practice questions would vanish from its analytics.
 *   4. No usable tags: the question-text cue alone, else unknown.
 */
export function resolveAttemptSubject(
  attempt: Pick<ClassroomAttempt, 'syllabus_tags' | 'question_text' | 'ai_marking' | 'mark_schemes'>,
  classSubject: string | null
): { subject: string | null; basis: SubjectBasis } {
  const paper =
    subjectFromPaperCode(attempt.mark_schemes?.paper_code) ??
    subjectFromPaperCode(attempt.ai_marking?.paper_code)
  if (paper) return { subject: paper, basis: 'paper' }

  const leaders = tagLeaders(attempt.syllabus_tags)
  if (leaders.length === 1) return { subject: leaders[0], basis: 'tags' }

  // Text only: tags and scheme withheld so the helper answers from the
  // question text alone.
  const text = getAttemptSubjectCode({
    id: '',
    marks_earned: 0,
    total_marks: 0,
    created_at: '',
    syllabus_tags: null,
    mark_schemes: null,
    question_text: attempt.question_text ?? null,
  })

  if (leaders.length > 1) {
    if (text && leaders.includes(text)) return { subject: text, basis: 'text' }
    if (classSubject && leaders.includes(classSubject)) return { subject: classSubject, basis: 'tags' }
    return { subject: leaders[0], basis: 'tags' }
  }
  if (text) return { subject: text, basis: 'text' }
  return { subject: null, basis: 'none' }
}

/** Whether an attempt counts toward a class teaching `subjectCode`. */
export function attemptInSubject(
  attempt: Pick<ClassroomAttempt, 'syllabus_tags' | 'question_text' | 'ai_marking' | 'mark_schemes'>,
  subjectCode: string
): boolean {
  return resolveAttemptSubject(attempt, subjectCode).subject === subjectCode
}

// ---------------------------------------------------------------------------
// Classroom scope
// ---------------------------------------------------------------------------

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

export type ScopeOptions = {
  /** The classroom's subject; null means the class has none set — no subject filter. */
  subjectCode: string | null
  /** Drop work marked before the student joined (default true). */
  sinceJoin?: boolean
  /** Inclusive lower bound on created_at (ISO). */
  since?: string | null
  /** Inclusive upper bound on created_at (ISO) — for views of a past week. */
  until?: string | null
}

/**
 * The classroom privacy rule, as a filter (spec §8): a teacher sees an
 * attempt only if its author is an ACTIVE member, it was marked at or after
 * the moment they (most recently) joined, and it is in the classroom's subject.
 * Anything that cannot be placed — an unparseable timestamp, a member with no
 * readable join date — is dropped: the rule fails closed.
 */
export function scopeClassroomAttempts<T extends ClassroomAttempt>(
  attempts: readonly T[],
  members: readonly ClassroomMember[],
  opts: ScopeOptions
): T[] {
  const sinceJoin = opts.sinceJoin !== false
  const joined = new Map<string, number>()
  for (const m of members) {
    if (m.status !== 'active') continue
    const ms = toMs(m.joined_at)
    if (ms === null) continue
    joined.set(m.student_id, ms)
  }
  const since = toMs(opts.since ?? null)
  const until = toMs(opts.until ?? null)

  return attempts.filter((a) => {
    const joinedMs = joined.get(a.user_id)
    if (joinedMs === undefined) return false
    const created = toMs(a.created_at)
    if (created === null) return false
    if (sinceJoin && created < joinedMs) return false
    if (since !== null && created < since) return false
    if (until !== null && created > until) return false
    if (opts.subjectCode && !attemptInSubject(a, opts.subjectCode)) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// Topics and blindspots
// ---------------------------------------------------------------------------

function topicsFrom(mastery: ClassMastery): TopicAnalytics[] {
  return mastery.leaves.map((l) => ({
    code: l.code,
    name: l.name,
    paper: l.paper,
    parentCode: l.parentCode,
    classAttempts: l.attempts,
    avgMastery: l.classPct,
    studentsAttempted: l.studentsAttempted,
    level: l.level,
  }))
}

/** One row per leaf of the subject's syllabus, in syllabus order. */
export function computeTopicAnalytics(
  attempts: readonly ClassroomAttempt[],
  subjectCode: string | null
): TopicAnalytics[] {
  if (!subjectCode) return []
  return topicsFrom(computeClassMastery(attempts, null, subjectCode))
}

/**
 * Topics the class is weak on (levelFor below `secure`) with at least
 * MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY marked attempts behind the average,
 * weakest first. For the chart rows, pass the result through
 * `toBlindspotInputs(topics, rosterSize)` (lib/teacher/blindspots.ts).
 */
export function computeBlindspots(
  attempts: readonly ClassroomAttempt[],
  subjectCode: string | null
): TopicAnalytics[] {
  return computeTopicAnalytics(attempts, subjectCode)
    .filter(isBlindspot)
    .sort(
      (a, b) =>
        (a.avgMastery as number) - (b.avgMastery as number) ||
        b.studentsAttempted - a.studentsAttempted ||
        a.code.localeCompare(b.code, undefined, { numeric: true })
    )
}

export function topicNameForCode(subjectCode: string | null, code: string): string {
  if (!subjectCode) return code
  return getSyllabusTopicByCode(subjectCode, code)?.name ?? code
}

// ---------------------------------------------------------------------------
// Students: accuracy × pace
// ---------------------------------------------------------------------------

/**
 * Accuracy at or above this is "accurate": levelFor's `secure` edge, which is
 * also the line the student's own speed/accuracy view draws
 * (lib/insights/speed-accuracy.ts — teacher-analytics.test.ts checks the two).
 */
export const QUADRANT_ACCURACY_THRESHOLD = SECURE_FROM_PCT

/** Fewer timed students than this and "faster than the class" means nothing. */
export const MIN_TIMED_STUDENTS_FOR_PACE = 3

/**
 * The fast/slow divider: the class median of students' minutes per mark, or
 * null when fewer than MIN_TIMED_STUDENTS_FOR_PACE are timed. Relative on
 * purpose. `attempts.time_spent_seconds` is measured by the marking request,
 * so an absolute "1.5 minutes a mark" line (the old rule) put every student
 * on the same side of it; a class median still separates the class's slower
 * half from its faster half, and keeps working unchanged once timings are
 * student-measured.
 */
export function paceDivider(metrics: ReadonlyArray<Pick<StudentQuadrantMetric, 'timePerMark'>>): number | null {
  const values = metrics
    .map((m) => m.timePerMark)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    .sort((a, b) => a - b)
  if (values.length < MIN_TIMED_STUDENTS_FOR_PACE) return null
  const mid = Math.floor(values.length / 2)
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]
}

/**
 * Untimed students (or a class with too few timed students for a divider)
 * are placed on accuracy alone: `safe` when accurate, `under_prepared`
 * otherwise — never "pacing" or "careless", which are claims about speed
 * there is no evidence for.
 */
export function computeQuadrant(
  accuracy: number,
  timePerMark: number | null,
  divider: number | null
): Quadrant {
  const accurate = accuracy >= QUADRANT_ACCURACY_THRESHOLD
  if (timePerMark === null || divider === null) return accurate ? 'safe' : 'under_prepared'
  const fast = timePerMark <= divider
  if (accurate) return fast ? 'safe' : 'pacing_risk'
  return fast ? 'careless_risk' : 'under_prepared'
}

function gradeFor(accuracy: number, board: string, subjectCode: string | null): string {
  // An IB class keeps the Cambridge default board on older rows (see
  // lib/teacher/subject.ts), and IB levels are not A*–E bands.
  if (subjectCode?.startsWith('ib-')) return NO_DATA
  return usesLetterGradeBands(board) ? predictGradeFromPercentage(accuracy).grade : NO_DATA
}

/**
 * One point per student on the grade-risk matrix.
 *
 * Only students in `studentIds` who have at least one marked attempt get a
 * point: a dot at 0% for a student who has not started would be a claim about
 * them, not an absence of evidence. `profiles` (from getStudentProfiles)
 * supplies names; without it every name is DISPLAY_NAME_FALLBACK. `board` is
 * the classroom's board and decides whether a letter grade is predicted.
 */
export function computeStudentQuadrants(
  attempts: readonly ClassroomAttempt[],
  studentIds: readonly string[],
  subjectCode: string | null,
  board: string,
  profiles?: ReadonlyMap<string, { full_name: string | null }>
): StudentQuadrantMetric[] {
  const roster = new Set(studentIds)
  const byStudent = new Map<string, ClassroomAttempt[]>()
  for (const a of attempts) {
    if (!roster.has(a.user_id)) continue
    const list = byStudent.get(a.user_id)
    if (list) list.push(a)
    else byStudent.set(a.user_id, [a])
  }

  const totalLeaves = subjectCode ? getTotalSyllabusLeaves(subjectCode) : 0
  const validLeaves = new Set(subjectCode ? getValidSyllabusCodes(subjectCode) : [])

  const draft: Array<Omit<StudentQuadrantMetric, 'quadrant'>> = []
  for (const studentId of roster) {
    const mine = byStudent.get(studentId) ?? []
    let earned = 0
    let total = 0
    let marked = 0
    let timedSeconds = 0
    let timedMarks = 0
    const leaves = new Map<string, { earned: number; total: number; attempts: number }>()

    for (const a of mine) {
      const marks = usableMarks(a)
      if (!marks) continue
      marked += 1
      earned += marks.earned
      total += marks.total
      const seconds = a.time_spent_seconds
      if (typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0) {
        timedSeconds += seconds
        timedMarks += marks.total
      }
      for (const tag of new Set(a.syllabus_tags ?? [])) {
        if (!validLeaves.has(tag)) continue
        const leaf = leaves.get(tag) ?? { earned: 0, total: 0, attempts: 0 }
        leaf.earned += marks.earned
        leaf.total += marks.total
        leaf.attempts += 1
        leaves.set(tag, leaf)
      }
    }
    if (marked === 0) continue

    const accuracy = (earned / total) * 100

    // Deficit = the weakest leaf the student's own mastery calls critical or
    // proficient. A sampled leaf (too few attempts) is not a deficit, and
    // neither is an exam-ready one.
    let deficit: StudentQuadrantMetric['biggestDeficit'] = null
    let deficitAttempts = 0
    for (const [code, t] of leaves) {
      const p = (t.earned / t.total) * 100
      const level = studentLeafLevel(p, t.attempts)
      if (level !== 'critical' && level !== 'proficient') continue
      const better =
        deficit === null ||
        p < deficit.percentage ||
        (p === deficit.percentage && t.attempts > deficitAttempts) ||
        (p === deficit.percentage && t.attempts === deficitAttempts && code < deficit.code)
      if (better) {
        deficit = { code, name: topicNameForCode(subjectCode, code), percentage: p }
        deficitAttempts = t.attempts
      }
    }

    draft.push({
      studentId,
      name: profiles?.get(studentId)?.full_name?.trim() || DISPLAY_NAME_FALLBACK,
      accuracy,
      timePerMark: timedMarks > 0 ? timedSeconds / 60 / timedMarks : null,
      coverage: totalLeaves > 0 ? (leaves.size / totalLeaves) * 100 : null,
      predictedGrade: gradeFor(accuracy, board, subjectCode),
      biggestDeficit: deficit,
      attemptCount: marked,
    })
  }

  const divider = paceDivider(draft)
  return draft
    .map((m) => ({ ...m, quadrant: computeQuadrant(m.accuracy, m.timePerMark, divider) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.studentId.localeCompare(b.studentId))
}

// ---------------------------------------------------------------------------
// Class summary
// ---------------------------------------------------------------------------

export function summarizeClassAnalytics(
  attempts: readonly ClassroomAttempt[],
  studentIds: readonly string[],
  subjectCode: string | null
): ClassSummary {
  const roster = new Set(studentIds)
  let earned = 0
  let total = 0
  let marked = 0
  const withWork = new Set<string>()
  for (const a of attempts) {
    if (!roster.has(a.user_id)) continue
    const marks = usableMarks(a)
    if (!marks) continue
    earned += marks.earned
    total += marks.total
    marked += 1
    withWork.add(a.user_id)
  }

  const mastery = computeClassMastery(attempts, [...roster], subjectCode)

  return {
    subjectCode,
    studentCount: roster.size,
    studentsWithWork: withWork.size,
    totalAttempts: marked,
    avgScore: marked > 0 ? (earned / total) * 100 : null,
    coverage: mastery.coveragePct,
    topicAnalytics: topicsFrom(mastery),
  }
}
