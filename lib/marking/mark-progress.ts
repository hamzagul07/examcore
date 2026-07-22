export type MarkProgressStage =
  | 'reading_work'
  | 'finding_scheme'
  | 'extracting_scheme'
  | 'deriving_scheme'
  | 'marking'
  | 'verifying'

export type MarkContextPayload = {
  paper_code?: string | null
  paper_session?: string | null
  question_number?: string | null
  subject_code?: string | null
  syllabus_tags?: string[] | null
  /** Scanned script split into several questions: how many were detected. */
  total_questions?: number | null
}

export type MarkProgressEvent =
  | { type: 'progress'; stage: MarkProgressStage; percent: number }
  | ({ type: 'context' } & MarkContextPayload)
  | { type: 'result'; payload: Record<string, unknown> }
  /** Premium full-marks rewrite, produced AFTER the result so it never delays
   * the score. Patches the already-delivered result in place. */
  | { type: 'rewrite'; rewrite: Record<string, unknown> }
  | { type: 'error'; error: string; retryable?: boolean }

/**
 * Canonical percentage for each stage.
 *
 * These used to jump 5 → 20 → 30 → 50 → 70 → 85 and then sit at 85 for the
 * entire derive/mark/verify stretch — 100–170s of apparent deadlock, which is
 * where the "it's broken" perception came from. The scale below reserves the
 * back half for the stages that actually dominate wall-clock.
 */
export function stagePercent(stage: MarkProgressStage): number {
  switch (stage) {
    case 'reading_work':
      return 8
    case 'finding_scheme':
      return 25
    case 'extracting_scheme':
      return 35
    case 'deriving_scheme':
      return 48
    case 'marking':
      return 62
    case 'verifying':
      return 86
    default:
      return 12
  }
}

/** Segment fill for slim stage bar (honest stages, not time-based %). */
export function stageSegmentPercent(stage: MarkProgressStage): number {
  return stagePercent(stage)
}

export function friendlyStageLabel(
  stage: MarkProgressStage,
  options?: {
    questionNumber?: string
    paperCode?: string | null
  }
): string {
  const paper = options?.paperCode?.trim()
  const q = options?.questionNumber?.trim()

  switch (stage) {
    case 'reading_work':
      return 'Reading your handwriting…'
    case 'finding_scheme':
      return paper
        ? `Finding the official mark scheme for ${paper}…`
        : 'Finding the official mark scheme…'
    case 'extracting_scheme':
      return q
        ? `Loading mark scheme for Question ${q}…`
        : 'Preparing the mark scheme…'
    case 'deriving_scheme':
      return 'Working out the mark scheme for this question…'
    case 'marking':
      return 'Marking your working line by line…'
    case 'verifying':
      return 'Second examiner is checking the marks…'
    default:
      return 'Marking in progress…'
  }
}

/**
 * Expectation copy shown during single-question waits.
 *
 * The old fixed line promised "30–60 seconds" against a measured p50 of
 * 150–200s, so a mark that was working still read as broken. These are honest
 * ranges keyed to how much work is genuinely left.
 */
export function markingTimeEstimateSubline(
  stage?: MarkProgressStage | null,
  options?: { totalQuestions?: number | null }
): string {
  const total = options?.totalQuestions ?? null
  if (total && total > 1) {
    return `Marking ${total} questions — around ${Math.max(1, Math.round((total * 45) / 60))}–${Math.max(2, Math.round((total * 75) / 60))} minutes. Every question is marked separately.`
  }
  switch (stage) {
    case 'reading_work':
      return 'Reading your pages. A full mark usually takes 1–3 minutes.'
    case 'finding_scheme':
    case 'extracting_scheme':
    case 'deriving_scheme':
      return 'Building the mark scheme — this is the slow part. Around a minute or two left.'
    case 'marking':
      return 'Marking now. Usually under a minute from here.'
    case 'verifying':
      return 'Final check — a second pass catches under- and over-marking. Nearly done.'
    default:
      return 'A full mark usually takes 1–3 minutes. You can leave this tab open.'
  }
}

export function showAnticipationZone(stage: MarkProgressStage): boolean {
  return stage === 'marking' || stage === 'verifying'
}
