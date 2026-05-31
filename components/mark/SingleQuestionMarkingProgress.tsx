'use client'

import { MarkingWaitExperience } from './MarkingWaitExperience'
import type {
  MarkContextPayload,
  MarkProgressStage,
} from '@/lib/marking/mark-progress'

export function SingleQuestionMarkingProgress({
  stage,
  context,
  error,
}: {
  stage: MarkProgressStage
  context?: MarkContextPayload | null
  error?: string | null
}) {
  if (error) {
    return <MarkingWaitExperience mode="single" stage={stage} error={error} />
  }

  return (
    <MarkingWaitExperience mode="single" stage={stage} context={context} />
  )
}
