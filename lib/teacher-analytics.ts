import {
  CAMBRIDGE_9709_SYLLABUS,
  TOTAL_SYLLABUS_TOPICS,
  getSyllabusTopicByCode,
} from '@/lib/syllabus'
import { predictGradeFromPercentage } from '@/lib/grade-boundaries'
import type { AttemptLite } from '@/lib/mastery'
import { calculateMastery } from '@/lib/mastery'

export type ClassroomAttempt = AttemptLite & { user_id: string }

export interface TopicAnalytics {
  code: string
  name: string
  paper: string
  classAttempts: number
  avgMastery: number | null
  studentsAttempted: number
}

export type Quadrant =
  | 'safe'
  | 'pacing_risk'
  | 'careless_risk'
  | 'under_prepared'

export interface StudentQuadrantMetric {
  studentId: string
  name: string
  accuracy: number
  timePerMark: number
  coverage: number
  predictedGrade: string
  biggestDeficit: {
    code: string
    name: string
    percentage: number
  } | null
  quadrant: Quadrant
  attemptCount: number
}

const ACCURACY_THRESHOLD = 70
const TIME_PER_MARK_THRESHOLD = 1.5 // minutes

export function computeTopicAnalytics(
  attempts: ClassroomAttempt[],
  studentCount: number
): TopicAnalytics[] {
  return CAMBRIDGE_9709_SYLLABUS.map((topic) => {
    const taggedAttempts = attempts.filter((a) =>
      (a.syllabus_tags || []).includes(topic.code)
    )

    if (taggedAttempts.length === 0) {
      return {
        code: topic.code,
        name: topic.name,
        paper: topic.paper,
        classAttempts: 0,
        avgMastery: null,
        studentsAttempted: 0,
      }
    }

    const earned = taggedAttempts.reduce(
      (s, a) => s + (a.marks_earned || 0),
      0
    )
    const available = taggedAttempts.reduce(
      (s, a) => s + (a.total_marks || 0),
      0
    )
    const avgMastery = available > 0 ? (earned / available) * 100 : 0
    const studentsAttempted = new Set(taggedAttempts.map((a) => a.user_id)).size

    return {
      code: topic.code,
      name: topic.name,
      paper: topic.paper,
      classAttempts: taggedAttempts.length,
      avgMastery,
      studentsAttempted,
    }
  })
}

export function computeBlindspots(
  topicAnalytics: TopicAnalytics[],
  totalStudents: number,
  minAttempts = 3,
  maxMastery = 50
) {
  return topicAnalytics
    .filter(
      (t) =>
        t.avgMastery !== null &&
        t.avgMastery < maxMastery &&
        t.classAttempts >= minAttempts
    )
    .sort((a, b) => (a.avgMastery ?? 0) - (b.avgMastery ?? 0))
    .map((t) => ({
      code: t.code,
      name: t.name,
      paper: t.paper,
      avgMastery: t.avgMastery ?? 0,
      studentsAttempted: t.studentsAttempted,
      totalStudents,
    }))
}

export function computeQuadrant(
  accuracy: number,
  timePerMark: number,
  coverage: number
): Quadrant {
  const fast = timePerMark <= TIME_PER_MARK_THRESHOLD
  const accurate = accuracy >= ACCURACY_THRESHOLD

  if (accurate && fast) return 'safe'
  if (accurate && !fast) return 'pacing_risk'
  if (!accurate && fast) return 'careless_risk'
  if (!accurate && !fast && coverage < 50) return 'under_prepared'
  return 'under_prepared'
}

export function computeStudentQuadrants(
  attempts: ClassroomAttempt[],
  studentProfiles: Map<string, { full_name: string | null }>
): StudentQuadrantMetric[] {
  const byStudent = new Map<string, ClassroomAttempt[]>()
  for (const a of attempts) {
    const list = byStudent.get(a.user_id) || []
    list.push(a)
    byStudent.set(a.user_id, list)
  }

  const metrics: StudentQuadrantMetric[] = []

  for (const [studentId, studentAttempts] of byStudent) {
    const profile = studentProfiles.get(studentId)
    const name = profile?.full_name?.trim() || 'Student'

    const validAttempts = studentAttempts.filter((a) => a.total_marks > 0)
    const accuracy =
      validAttempts.length > 0
        ? validAttempts.reduce(
            (s, a) => s + (a.marks_earned / a.total_marks) * 100,
            0
          ) / validAttempts.length
        : 0

    const timedAttempts = validAttempts.filter(
      (a) => a.time_spent_seconds && a.total_marks
    )
    const timePerMark =
      timedAttempts.length > 0
        ? timedAttempts.reduce(
            (s, a) =>
              s + (a.time_spent_seconds! / 60 / a.total_marks),
            0
          ) / timedAttempts.length
        : 2

    const attemptedTopics = new Set<string>()
    for (const a of studentAttempts) {
      for (const tag of a.syllabus_tags || []) {
        attemptedTopics.add(tag)
      }
    }
    const coverage = (attemptedTopics.size / TOTAL_SYLLABUS_TOPICS) * 100

    const masteries = calculateMastery(studentAttempts)
    const critical = masteries
      .filter((m) => m.attemptsCount > 0)
      .sort((a, b) => a.percentage - b.percentage)
    const worst = critical[0]
    const biggestDeficit = worst
      ? {
          code: worst.code,
          name: worst.name,
          percentage: worst.percentage,
        }
      : null

    const predicted = predictGradeFromPercentage(accuracy)

    metrics.push({
      studentId,
      name,
      accuracy,
      timePerMark,
      coverage,
      predictedGrade: predicted.grade,
      biggestDeficit,
      quadrant: computeQuadrant(accuracy, timePerMark, coverage),
      attemptCount: studentAttempts.length,
    })
  }

  return metrics.sort((a, b) => a.name.localeCompare(b.name))
}

export function summarizeClassAnalytics(
  attempts: ClassroomAttempt[],
  studentCount: number
) {
  const totalAttempts = attempts.length
  const avgScore =
    totalAttempts > 0
      ? attempts.reduce(
          (s, a) =>
            s + (a.total_marks ? (a.marks_earned / a.total_marks) * 100 : 0),
          0
        ) / totalAttempts
      : 0

  return {
    studentCount,
    totalAttempts,
    avgScore,
    topicAnalytics: computeTopicAnalytics(attempts, studentCount),
  }
}

export function topicNameForCode(code: string): string {
  return getSyllabusTopicByCode(code)?.name ?? code
}
