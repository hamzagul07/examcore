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
  error?: string
  retryable?: boolean
}

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
}

export function handleMarkStreamEvent(
  event: MarkStreamEvent,
  ctx: MarkStreamContext
): 'continue' | 'error' | 'result' {
  if (event.type === 'progress' && event.stage && event.percent != null) {
    ctx.setMarkProgress({
      percent: event.percent,
      stage: event.stage,
      questionNumber: ctx.questionNumber.trim() || undefined,
    })
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
    ctx.setMarkStreamError(msg)
    ctx.setErrorMsg(msg)
    ctx.setErrorRetryable(!!event.retryable)
    ctx.setLoading(false)
    ctx.setMarkProgress(null)
    ctx.setMarkContext(null)
    return 'error'
  }
  return 'continue'
}
