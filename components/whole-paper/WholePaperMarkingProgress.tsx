'use client'

import {
  MarkingWaitExperience,
  type MarkingWaitErrorActions,
} from '@/components/mark/MarkingWaitExperience'
import type { MarkContextPayload } from '@/lib/marking/mark-progress'

export function WholePaperMarkingProgress({
  phase,
  message,
  questionsCompleted,
  questionsTotal,
  paperCode,
  paperSession,
  context,
  error,
  onRetry,
  onBackToUpload,
  retryDisabled,
}: {
  phase: string
  message: string
  questionsCompleted: number
  questionsTotal: number
  paperCode: string
  paperSession: string
  context?: MarkContextPayload | null
  error?: string | null
} & MarkingWaitErrorActions) {
  return (
    <MarkingWaitExperience
      mode="whole"
      phase={phase}
      message={message}
      questionsCompleted={questionsCompleted}
      questionsTotal={questionsTotal}
      paperCode={paperCode}
      paperSession={paperSession}
      context={context}
      error={error}
      onRetry={onRetry}
      onBackToUpload={onBackToUpload}
      retryDisabled={retryDisabled}
    />
  )
}
