export type MarkProgressStage =
  | 'reading_work'
  | 'finding_scheme'
  | 'extracting_scheme'
  | 'marking'

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
  | { type: 'context' } & MarkContextPayload
  | { type: 'result'; payload: Record<string, unknown> }
  | { type: 'error'; error: string; retryable?: boolean }

/** Segment fill for slim stage bar (honest stages, not time-based %). */
export function stageSegmentPercent(stage: MarkProgressStage): number {
  switch (stage) {
    case 'reading_work':
      return 22
    case 'finding_scheme':
      return 48
    case 'extracting_scheme':
      return 68
    case 'marking':
      return 88
    default:
      return 12
  }
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
    case 'marking':
      return 'Almost there — finishing your marks…'
    default:
      return 'Marking in progress…'
  }
}

/** Calm expectation copy shown during single-question waits. */
export function markingTimeEstimateSubline(): string {
  return 'Usually 30–60 seconds for a single question.'
}

export function showAnticipationZone(stage: MarkProgressStage): boolean {
  return stage === 'marking'
}
