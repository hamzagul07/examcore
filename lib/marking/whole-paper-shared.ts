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
  /**
   * When the run route claimed this job (ISO). A claim older than
   * WHOLE_PAPER_CLAIM_STALE_MS with the phase still 'marking' is a killed
   * function, and the next run may take the job over. Without it a job whose
   * runner died sat in 'marking' forever: every retry got 'already_running'.
   */
  claimed_at?: string
  /** The upload was a PDF rather than photographed pages (for mark_runs). */
  has_pdf?: boolean
  /** Non-fatal things init had to do to the upload (a page that would not
   * OCR, a duplicate dropped, a PDF cut at the page cap). Shown once. */
  warnings?: string[]
  /** Questions the student answered, before the tier limit cut the list. */
  questions_in_paper?: number
  /** The tier's whole-paper question limit that applied at init. */
  question_limit?: number
  /**
   * Question numbers answered but beyond the limit. Numbers only — never the
   * text — so a per-question retry cannot be used to mark them for free.
   */
  preview_cut_questions?: string[]
}

/**
 * A 'marking' claim older than this belongs to a function that is no longer
 * running: the route's maxDuration is 800s, so nothing legitimate is still
 * marking after fifteen minutes.
 */
export const WHOLE_PAPER_CLAIM_STALE_MS = 15 * 60_000

/**
 * True when a job in 'marking' was claimed long enough ago to be dead.
 *
 * `createdAt` (attempts.created_at) stands in for the claim stamp on rows
 * that have none — jobs claimed by the run route as deployed BEFORE
 * `claimed_at` existed. Those used to be stale on sight, which was wrong for
 * exactly the runs in flight at deploy time: the status poll reported
 * `stale: true` two seconds later, the client offered Retry, and the run
 * route's claim guard admitted it while the original function was still
 * marking — two runners on one paper and, for a signed-in student, a second
 * reservation. A stampless job is now stale only once it is older than the
 * window measured from creation; with neither timestamp there is nothing to
 * go on and it stays stale on sight, as before.
 */
export function isWholePaperClaimStale(
  job: Pick<WholePaperJobState, 'phase' | 'claimed_at'>,
  opts: { now?: number; createdAt?: string | null } = {}
): boolean {
  if (job.phase !== 'marking') return false
  const now = opts.now ?? Date.now()
  const stamp = job.claimed_at ?? opts.createdAt ?? null
  if (!stamp) return true
  const since = Date.parse(stamp)
  if (!Number.isFinite(since)) return true
  return now - since > WHOLE_PAPER_CLAIM_STALE_MS
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
