'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Zap } from 'lucide-react'
import { InterventionGenerator } from './InterventionGenerator'

interface Blindspot {
  code: string
  name: string
  paper: string
  avgMastery: number
  studentsAttempted: number
  totalStudents: number
}

interface Props {
  classroomId: string
  blindspots: Blindspot[]
}

export function ClassBlindspotRadar({ classroomId, blindspots }: Props) {
  const [showIntervention, setShowIntervention] = useState(false)
  const topBlindspot = blindspots[0]

  if (!topBlindspot) {
    return (
      <div className="ec-card p-8">
        <h2 className="mb-2 text-xl font-bold text-[var(--ec-text-primary)]">
          Class Blindspot Radar
        </h2>
        <p className="text-[var(--ec-text-secondary)]">
          Not enough data yet. Need at least 3 attempts per topic across
          students.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ec-card relative overflow-hidden p-8"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full ec-glow-orb-critical blur-3xl opacity-50" />

      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 ec-score-low" />
          <span className="ec-label-tech ec-score-low">CLASS BLINDSPOT DETECTED</span>
        </div>

        <h2 className="mb-3 text-4xl font-bold text-[var(--ec-text-primary)]">
          {topBlindspot.name}
        </h2>
        <p className="mb-6 text-[var(--ec-text-secondary)]">
          Syllabus code{' '}
          <span className="font-mono text-[var(--ec-text-primary)]">{topBlindspot.code}</span> (
          {topBlindspot.paper}) — class average is at{' '}
          <span className="font-bold ec-score-low">
            {topBlindspot.avgMastery.toFixed(0)}%
          </span>{' '}
          across {topBlindspot.studentsAttempted} students.
        </p>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-[var(--ec-text-secondary)]">
            <span>Mastery</span>
            <span>{topBlindspot.avgMastery.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--ec-surface-raised)]">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400"
              style={{ width: `${topBlindspot.avgMastery}%` }}
            />
          </div>
        </div>

        {blindspots.length > 1 && (
          <div className="mb-6">
            <div className="mb-2 text-xs text-[var(--ec-text-secondary)]">OTHER FAILING TOPICS</div>
            <div className="flex flex-wrap gap-2">
              {blindspots.slice(1, 5).map((bs) => (
                <span
                  key={bs.code}
                  className="ec-chip ec-chip-critical rounded-full px-3 py-1 text-sm"
                >
                  {bs.name} ({bs.avgMastery.toFixed(0)}%)
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowIntervention(true)}
          className="ec-btn-primary inline-flex items-center gap-2"
        >
          <Zap className="h-5 w-5" />
          Generate Targeted Intervention Test
        </button>
      </div>

      {showIntervention && (
        <InterventionGenerator
          classroomId={classroomId}
          targetCodes={blindspots.slice(0, 3).map((b) => b.code)}
          onClose={() => setShowIntervention(false)}
        />
      )}
    </motion.div>
  )
}
