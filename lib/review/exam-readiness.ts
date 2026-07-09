import 'server-only'

import { createServiceClient } from '@/lib/supabase-server'
import {
  calculateParentMastery,
  flattenLeafMasteries,
  calculateSyllabusCoverage,
} from '@/lib/mastery'
import {
  getAttemptSubjectCode,
  type AttemptWithPaper,
} from '@/lib/syllabi/attempts'
import { hasSyllabusTree } from '@/lib/syllabi'
import { predictGrade } from '@/lib/prediction'
import { getSubjectByCode } from '@/lib/profile-options'

export type SubjectReadiness = {
  subject: string
  subjectLabel: string
  predictedGrade: string
  color: string
  confidence: number
  coveragePct: number
  nextLevelTip: string
}

/**
 * Cross-subject "exam readiness" — the loop's destination. For each subject the
 * student has marked work in, uses the existing grade-prediction engine
 * (recent-attempts average → boundary grade) plus syllabus coverage, and the
 * prediction's own "clear X to reach the next grade" tip. Server-only.
 */
export async function getExamReadiness(userId: string): Promise<SubjectReadiness[]> {
  const admin = createServiceClient()
  const { data } = await admin
    .from('attempts')
    .select(
      `
      id, marks_earned, total_marks, syllabus_tags, created_at,
      time_spent_seconds, question_text, source_type, error_classifications,
      mark_schemes ( question_number, paper_code, paper_session )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(300)

  const attempts = (data ?? []) as unknown as AttemptWithPaper[]
  if (!attempts.length) return []

  const bySubject = new Map<string, AttemptWithPaper[]>()
  for (const a of attempts) {
    const code = getAttemptSubjectCode(a)
    if (!code || !hasSyllabusTree(code)) continue
    const bucket = bySubject.get(code)
    if (bucket) bucket.push(a)
    else bySubject.set(code, [a])
  }

  const out: SubjectReadiness[] = []
  for (const [subject, subjectAttempts] of bySubject) {
    const masteries = flattenLeafMasteries(calculateParentMastery(subjectAttempts, subject))
    const prediction = predictGrade(subjectAttempts, masteries)
    out.push({
      subject,
      subjectLabel: getSubjectByCode(subject)?.label ?? subject,
      predictedGrade: prediction.predictedGrade,
      color: prediction.color,
      confidence: prediction.confidence,
      coveragePct: Math.round(calculateSyllabusCoverage(masteries)),
      nextLevelTip: prediction.nextLevelTip,
    })
  }

  // Most attempts / highest confidence first.
  out.sort((a, b) => b.confidence - a.confidence)
  return out
}
