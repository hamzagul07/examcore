'use client'

import { Loader2 } from 'lucide-react'
import { Progress } from '@/components/ui/Progress'
import { formatEstimatedTime } from '@/lib/marking/whole-paper'

export function WholePaperMarkingProgress({
  phase,
  message,
  questionsCompleted,
  questionsTotal,
  estimatedSecondsRemaining,
}: {
  phase: string
  message: string
  questionsCompleted: number
  questionsTotal: number
  estimatedSecondsRemaining?: number
}) {
  const pct =
    questionsTotal > 0
      ? Math.round((questionsCompleted / questionsTotal) * 100)
      : phase === 'ocr' || phase === 'segmenting'
        ? 15
        : 5

  const phaseLabel =
    phase === 'ocr' || phase === 'segmenting'
      ? 'Extracting text from your work…'
      : message

  return (
    <div className="ec-card space-y-6 p-8 sm:p-10">
      <p className="ec-label-tech text-center">MARKING IN PROGRESS</p>
      <div className="flex items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        <p className="text-lg font-semibold text-white">{phaseLabel}</p>
      </div>
      {questionsTotal > 0 && phase === 'marking' && (
        <p className="text-center font-mono text-sm text-slate-400">
          Question {Math.min(questionsCompleted + 1, questionsTotal)} of{' '}
          {questionsTotal}
        </p>
      )}
      <div className="mx-auto max-w-md">
        <Progress value={pct} variant="spectrum" size="lg" ariaLabel="Marking progress" />
        <p className="mt-2 text-center font-mono text-xs text-slate-500">{pct}%</p>
      </div>
      {estimatedSecondsRemaining != null && estimatedSecondsRemaining > 0 && (
        <p className="text-center text-sm text-slate-500">
          About {formatEstimatedTime(estimatedSecondsRemaining)} remaining
        </p>
      )}
    </div>
  )
}
