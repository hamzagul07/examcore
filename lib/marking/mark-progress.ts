export type MarkProgressStage =
  | 'reading_work'
  | 'finding_scheme'
  | 'extracting_scheme'
  | 'marking'

export type MarkProgressEvent =
  | { type: 'progress'; stage: MarkProgressStage; percent: number }
  | { type: 'result'; payload: Record<string, unknown> }
  | { type: 'error'; error: string; retryable?: boolean }

export function friendlyStageLabel(
  stage: MarkProgressStage,
  questionNumber?: string
): string {
  switch (stage) {
    case 'reading_work':
      return 'Reading your work…'
    case 'finding_scheme':
      return 'Finding the mark scheme…'
    case 'extracting_scheme':
      return questionNumber
        ? `Looking up Question ${questionNumber}…`
        : 'Preparing the mark scheme…'
    case 'marking':
      return 'Marking your work like a Cambridge examiner…'
    default:
      return 'Marking in progress…'
  }
}
