'use client'

import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Progress } from '@/components/ui/Progress'
import {
  friendlyStageLabel,
  type MarkProgressStage,
} from '@/lib/marking/mark-progress'

export function SingleQuestionMarkingProgress({
  percent,
  stage,
  questionNumber,
}: {
  percent: number
  stage: MarkProgressStage
  questionNumber?: string
}) {
  const label = friendlyStageLabel(stage, questionNumber)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="ec-card space-y-6 p-8 sm:p-10"
    >
      <p className="ec-label-tech text-center">MARKING IN PROGRESS</p>
      <div className="flex items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        <motion.p
          key={label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-lg font-semibold text-white"
        >
          {label}
        </motion.p>
      </div>
      <div className="mx-auto max-w-md">
        <Progress
          value={percent}
          variant="spectrum"
          size="lg"
          ariaLabel="Marking progress"
        />
        <p className="mt-2 text-center font-mono text-xs text-slate-500">
          {percent}%
        </p>
      </div>
    </motion.div>
  )
}
