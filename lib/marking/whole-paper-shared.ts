/**
 * Shared whole-paper job payload stored in attempts.ai_marking during processing.
 */
import type { StoredPageOcr } from './whole-paper-pages'
import type {
  QuestionMarkResult,
  WholePaperJobProgress,
  WholePaperResult,
} from './types'

export type WholePaperJobState = WholePaperJobProgress & {
  paper_code?: string
  paper_session?: string
  page_photo_urls?: string[]
  pages_ocr?: StoredPageOcr[]
  segmented_questions?: Array<{
    question_number: string
    answer_text: string
    page_indices?: number[]
  }>
  partial_questions?: QuestionMarkResult[]
}

export function isWholePaperJob(
  data: unknown
): data is WholePaperJobState {
  return (
    !!data &&
    typeof data === 'object' &&
    'phase' in data &&
    typeof (data as WholePaperJobState).phase === 'string'
  )
}

export function jobToResult(job: WholePaperJobState): WholePaperResult | null {
  return job.result ?? null
}
