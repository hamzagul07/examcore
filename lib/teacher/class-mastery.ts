/**
 * Class mastery — one pass over a class's marked work, rolled up the syllabus
 * tree of the classroom's subject.
 *
 * Everything topic-shaped a teacher sees (the blindspot list, topic analytics,
 * coverage, "who is critical on this leaf" for a drill) is read from here, so
 * those surfaces cannot disagree about a number. It is generic over the
 * lib/syllabi registry: a Chemistry (9701) class is rolled up over the 9701
 * tree exactly as a Mathematics (9709) class is over 9709's, and a subject
 * with no tree yields an empty rollup rather than borrowing another subject's
 * topics.
 *
 * Two different questions are kept apart on purpose:
 *
 *   - How is the CLASS doing on a leaf? `classPct`, marks-weighted over every
 *     marked attempt tagged with it (the same Σearned/Σavailable rule as a
 *     student's own mastery), banded by `levelFor`.
 *   - How many STUDENTS are where? `studentLevels`, each student's own level
 *     on the leaf computed exactly as lib/mastery computes it for them, so a
 *     teacher reading "4 critical" is reading the four students whose own
 *     heatmaps say critical.
 *
 * Pure: no I/O, no clock. Callers pass attempts already scoped to the class
 * (lib/teacher-classroom-data.ts getClassroomAttempts).
 */

import { MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY } from '@/lib/mastery'
import { getSyllabusTree } from '@/lib/syllabi'
import { levelFor, type BlindspotLevel } from '@/lib/teacher/blindspots'

/** The fields class mastery reads; ClassroomAttempt satisfies it. */
export type MasteryAttempt = {
  user_id: string
  marks_earned: number | null
  total_marks: number | null
  syllabus_tags: string[] | null
}

/** A student's own level on one leaf — lib/mastery's levels minus `unattempted`. */
export type StudentLeafLevel = 'sampled' | 'critical' | 'proficient' | 'exam_ready'

export type ClassLeafMastery = {
  code: string
  name: string
  paper: string
  parentCode: string
  parentName: string
  /** Marked attempts tagged with this leaf. */
  attempts: number
  marksEarned: number
  marksAvailable: number
  /** Marks-weighted class average, 0–100; null with no marked attempt. */
  classPct: number | null
  /** `levelFor(classPct)`, or null while fewer than MIN attempts back it. */
  level: BlindspotLevel | null
  studentsAttempted: number
  /** Roster size the rollup was computed against. */
  totalStudents: number
  studentLevels: Record<StudentLeafLevel, number>
  /** Students whose own level on this leaf is critical, sorted — a drill's audience. */
  criticalStudentIds: string[]
}

export type ClassParentMastery = {
  code: string
  name: string
  paper: string
  leaves: ClassLeafMastery[]
  attempts: number
  /** Marks-weighted over the parent's leaves' attempts (an attempt tagged with two leaves counts once). */
  classPct: number | null
  studentsAttempted: number
  /** The evidenced leaf with the lowest class average, if any. */
  weakestLeafCode: string | null
}

export type ClassMastery = {
  subjectCode: string | null
  totalStudents: number
  /** Assessable leaves in the subject's tree (the coverage denominator). */
  totalLeaves: number
  /** Leaves with at least one marked attempt. */
  leavesTouched: number
  /** leavesTouched / totalLeaves, 0–100; null when the subject has no tree. */
  coveragePct: number | null
  parents: ClassParentMastery[]
  /** Every leaf in syllabus order (the parents' leaves, flattened). */
  leaves: ClassLeafMastery[]
}

/**
 * A student's level on a leaf from their own marked attempts on it — the rule
 * lib/mastery applies (sampled below MIN attempts, then the levelFor bands).
 */
export function studentLeafLevel(pct: number, attempts: number): StudentLeafLevel {
  if (attempts < MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY) return 'sampled'
  const band = levelFor(pct)
  if (band === 'critical') return 'critical'
  if (band === 'proficient') return 'proficient'
  return 'exam_ready'
}

/**
 * An attempt counts as evidence only with a positive total. An attempt whose
 * total is missing or zero has no percentage, and counting it as 0 would drag
 * a class average down with marks that were never available.
 */
export function usableMarks(
  a: Pick<MasteryAttempt, 'marks_earned' | 'total_marks'>
): { earned: number; total: number } | null {
  const total = a.total_marks
  const earned = a.marks_earned
  if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) return null
  if (typeof earned !== 'number' || !Number.isFinite(earned)) return null
  // A reconciliation quirk can record more than the total; a class average
  // above 100% is not a thing a teacher can act on.
  return { earned: Math.max(0, Math.min(earned, total)), total }
}

function pct(earned: number, total: number): number | null {
  return total > 0 ? (earned / total) * 100 : null
}

type Tally = { earned: number; total: number; attempts: number }

function emptyLevels(): Record<StudentLeafLevel, number> {
  return { sampled: 0, critical: 0, proficient: 0, exam_ready: 0 }
}

/**
 * Roll a class's attempts up the subject's syllabus tree.
 *
 * `studentIds` is the roster: attempts by anyone else are ignored (a defence
 * in depth — the loader already scopes), and it is the denominator for
 * `totalStudents`. Pass null to take the roster from the attempts themselves.
 */
export function computeClassMastery(
  attempts: readonly MasteryAttempt[],
  studentIds: readonly string[] | null,
  subjectCode: string | null
): ClassMastery {
  const roster = studentIds ? new Set(studentIds) : null
  const tree = subjectCode ? getSyllabusTree(subjectCode) ?? [] : []
  const totalStudents = roster
    ? roster.size
    : new Set(attempts.map((a) => a.user_id)).size

  const leafCodes = new Set<string>()
  for (const g of tree) for (const l of g.leaves) leafCodes.add(l.code)

  // leaf → class tally; leaf → student → tally; parent → tally (per attempt).
  const byLeaf = new Map<string, Tally>()
  const byLeafStudent = new Map<string, Map<string, Tally>>()
  const leafParent = new Map<string, string>()
  for (const g of tree) for (const l of g.leaves) leafParent.set(l.code, g.parent.code)
  const byParent = new Map<string, Tally & { students: Set<string> }>()

  for (const a of attempts) {
    if (roster && !roster.has(a.user_id)) continue
    const marks = usableMarks(a)
    if (!marks) continue
    // One attempt tagged "1.1" twice is still one attempt on 1.1.
    const leaves = new Set((a.syllabus_tags ?? []).filter((t) => leafCodes.has(t)))
    const parentsSeen = new Set<string>()
    for (const code of leaves) {
      const leaf = byLeaf.get(code) ?? { earned: 0, total: 0, attempts: 0 }
      leaf.earned += marks.earned
      leaf.total += marks.total
      leaf.attempts += 1
      byLeaf.set(code, leaf)

      let students = byLeafStudent.get(code)
      if (!students) {
        students = new Map()
        byLeafStudent.set(code, students)
      }
      const mine = students.get(a.user_id) ?? { earned: 0, total: 0, attempts: 0 }
      mine.earned += marks.earned
      mine.total += marks.total
      mine.attempts += 1
      students.set(a.user_id, mine)

      const parentCode = leafParent.get(code)
      if (parentCode && !parentsSeen.has(parentCode)) {
        parentsSeen.add(parentCode)
        const parent = byParent.get(parentCode) ?? { earned: 0, total: 0, attempts: 0, students: new Set<string>() }
        parent.earned += marks.earned
        parent.total += marks.total
        parent.attempts += 1
        parent.students.add(a.user_id)
        byParent.set(parentCode, parent)
      }
    }
  }

  const parents: ClassParentMastery[] = tree.map((g) => {
    const leaves: ClassLeafMastery[] = g.leaves.map((l) => {
      const tally = byLeaf.get(l.code)
      const students = byLeafStudent.get(l.code) ?? new Map<string, Tally>()
      const classPct = tally ? pct(tally.earned, tally.total) : null
      const studentLevels = emptyLevels()
      const critical: string[] = []
      for (const [studentId, t] of students) {
        const level = studentLeafLevel(pct(t.earned, t.total) ?? 0, t.attempts)
        studentLevels[level] += 1
        if (level === 'critical') critical.push(studentId)
      }
      const attemptsOnLeaf = tally?.attempts ?? 0
      return {
        code: l.code,
        name: l.name,
        paper: l.paper,
        parentCode: g.parent.code,
        parentName: g.parent.name,
        attempts: attemptsOnLeaf,
        marksEarned: tally?.earned ?? 0,
        marksAvailable: tally?.total ?? 0,
        classPct,
        level:
          classPct !== null && attemptsOnLeaf >= MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY
            ? levelFor(classPct)
            : null,
        studentsAttempted: students.size,
        totalStudents,
        studentLevels,
        criticalStudentIds: critical.sort(),
      }
    })

    const parentTally = byParent.get(g.parent.code)
    const evidenced = leaves.filter((l) => l.level !== null && l.classPct !== null)
    const weakest = evidenced.reduce<ClassLeafMastery | null>(
      (worst, l) =>
        worst === null || (l.classPct as number) < (worst.classPct as number) ? l : worst,
      null
    )
    return {
      code: g.parent.code,
      name: g.parent.name,
      paper: g.parent.paper,
      leaves,
      attempts: parentTally?.attempts ?? 0,
      classPct: parentTally ? pct(parentTally.earned, parentTally.total) : null,
      studentsAttempted: parentTally?.students.size ?? 0,
      weakestLeafCode: weakest?.code ?? null,
    }
  })

  const leaves = parents.flatMap((p) => p.leaves)
  const totalLeaves = leaves.length
  const leavesTouched = leaves.filter((l) => l.attempts > 0).length

  return {
    subjectCode,
    totalStudents,
    totalLeaves,
    leavesTouched,
    coveragePct: totalLeaves > 0 ? (leavesTouched / totalLeaves) * 100 : null,
    parents,
    leaves,
  }
}
