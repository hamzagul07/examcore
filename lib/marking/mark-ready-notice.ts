import { namedSubjectOrNull } from '@/lib/marking/subject-name'

/**
 * Everything the mark-ready email needs, lifted off a finished single-question
 * payload. Pure so both /api/mark/process paths (SSE and JSON) and the tests
 * build the same notice from the same fields.
 */
export type MarkReadyNotice = {
  userId: string | null
  attemptId: string | null
  marksEarned: number | null
  totalMarks: number | null
  subjectLabel: string | null
  /** Catalog code, e.g. "9708" — for the "mark another" deep link. */
  subjectCode: string | null
  paperRef: string | null
  predictedMarks: number | null
  weakTopics: string[] | null
  whatToStudyNext: string | null
}

export function markReadyNoticeFromPayload(
  userId: string | null,
  payload: unknown,
  predictedMarks: number | null = null
): MarkReadyNotice {
  const done = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>
  const ai = (done.ai_marking && typeof done.ai_marking === 'object' ? done.ai_marking : {}) as {
    weak_topics?: unknown
    what_to_study_next?: unknown
  }
  const subjectCode =
    typeof done.subject_code === 'string' && done.subject_code.trim()
      ? done.subject_code.trim()
      : null
  return {
    userId,
    attemptId: typeof done.attempt_id === 'string' ? done.attempt_id : null,
    marksEarned: typeof done.marks_earned === 'number' ? done.marks_earned : null,
    totalMarks: typeof done.total_marks === 'number' ? done.total_marks : null,
    subjectLabel: namedSubjectOrNull(subjectCode),
    subjectCode,
    paperRef: typeof done.paper_code === 'string' && done.paper_code.trim() ? done.paper_code : null,
    predictedMarks,
    weakTopics: Array.isArray(ai.weak_topics)
      ? ai.weak_topics.filter((t): t is string => typeof t === 'string')
      : null,
    whatToStudyNext:
      typeof ai.what_to_study_next === 'string' ? ai.what_to_study_next : null,
  }
}
