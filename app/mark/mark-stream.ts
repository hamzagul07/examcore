import type { Dispatch, SetStateAction } from 'react'
import type { MarkingResultData } from '@/components/MarkingResultView'
import type {
  MarkContextPayload,
  MarkProgressStage,
} from '@/lib/marking/mark-progress'

/** Notify the header chip (and anyone listening) to refetch billing summary. */
export function refreshBillingSummary() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ec:billing-refresh'))
  }
}

export type MarkStreamEvent = {
  type: string
  stage?: MarkProgressStage
  percent?: number
  paper_code?: string | null
  paper_session?: string | null
  question_number?: string | null
  subject_code?: string | null
  syllabus_tags?: string[] | null
  total_questions?: number | null
  payload?: MarkingResultData
  /** Premium full-marks rewrite, delivered after `result` so it never delays
   * the score. Patches the already-revealed result in place. */
  rewrite?: FullMarksRewritePayload
  /** Which attempt the rewrite belongs to — checked before patching, since a
   * slow rewrite can arrive after the user has moved on to another mark. */
  attempt_id?: string | null
  /** Telemetry row id for this run, sent first so the wait screen can post a
   * predicted score back before any attempt row exists. */
  mark_run_id?: string | null
  /** First-pass marks, delivered before the verify pass. Shown as a read being
   * checked — never as the final mark, which verify can still move. */
  marks_earned?: number
  total_marks?: number
  error?: string
  retryable?: boolean
}

export type FullMarksRewritePayload = NonNullable<
  MarkingResultData['ai_marking']['full_marks_rewrite']
>

export function parseMarkStreamPart(part: string): MarkStreamEvent | null {
  const line = part.trim()
  if (!line.startsWith('data:')) return null
  const payload = line.replace(/^data:\s?/, '')
  if (!payload) return null
  try {
    return JSON.parse(payload) as MarkStreamEvent
  } catch {
    return null
  }
}

export type MarkStreamContext = {
  setMarkRunId: Dispatch<SetStateAction<string | null>>
  setProvisionalScore: Dispatch<
    SetStateAction<{ marksEarned: number; totalMarks: number } | null>
  >
  setMarkProgress: Dispatch<
    SetStateAction<{
      percent: number
      stage: MarkProgressStage
      questionNumber?: string
    } | null>
  >
  setMarkContext: Dispatch<SetStateAction<MarkContextPayload | null>>
  setMarkStreamError: Dispatch<SetStateAction<string | null>>
  setErrorMsg: Dispatch<SetStateAction<string>>
  setErrorRetryable: Dispatch<SetStateAction<boolean>>
  setLoading: Dispatch<SetStateAction<boolean>>
  questionNumber: string
  /**
   * Soft recovery instead of the full-screen / FormErrorAlert failure path.
   * When set, stream errors clear the wait chrome and surface a calm notice.
   */
  onSoftMarkFailure?: (serverMessage: string) => void
}

export function handleMarkStreamEvent(
  event: MarkStreamEvent,
  ctx: MarkStreamContext
): 'continue' | 'error' | 'result' {
  if (event.type === 'run') {
    ctx.setMarkRunId(event.mark_run_id ?? null)
  }
  if (
    event.type === 'provisional_score' &&
    typeof event.marks_earned === 'number' &&
    typeof event.total_marks === 'number'
  ) {
    ctx.setProvisionalScore({
      marksEarned: event.marks_earned,
      totalMarks: event.total_marks,
    })
  }
  if (event.type === 'progress' && event.stage && event.percent != null) {
    const stage = event.stage
    const percent = event.percent
    ctx.setMarkProgress((prev) => ({
      // Never let the bar run backwards. Stage percentages are ordered, but a
      // reordering upstream (or an out-of-order event) should degrade to "bar
      // pauses", never to "bar visibly rewinds" — which reads as a fault.
      percent: prev ? Math.max(prev.percent, percent) : percent,
      stage,
      questionNumber: ctx.questionNumber.trim() || undefined,
    }))
  }
  if (event.type === 'context') {
    ctx.setMarkContext((prev) => ({
      ...prev,
      paper_code: event.paper_code ?? prev?.paper_code,
      paper_session: event.paper_session ?? prev?.paper_session,
      question_number: event.question_number ?? prev?.question_number,
      subject_code: event.subject_code ?? prev?.subject_code,
      syllabus_tags: event.syllabus_tags ?? prev?.syllabus_tags,
      total_questions: event.total_questions ?? prev?.total_questions,
    }))
  }
  if (event.type === 'result' && event.payload) {
    return 'result'
  }
  if (event.type === 'error') {
    const msg = event.error || 'Marking failed.'
    ctx.setLoading(false)
    ctx.setMarkProgress(null)
    ctx.setMarkContext(null)
    // Prefer soft recovery: close the wait chrome, keep uploads, no error alert.
    if (ctx.onSoftMarkFailure) {
      ctx.setMarkStreamError(null)
      ctx.setErrorMsg('')
      ctx.setErrorRetryable(false)
      ctx.onSoftMarkFailure(msg)
      return 'error'
    }
    ctx.setMarkStreamError(msg)
    ctx.setErrorMsg(msg)
    ctx.setErrorRetryable(!!event.retryable)
    return 'error'
  }
  return 'continue'
}
