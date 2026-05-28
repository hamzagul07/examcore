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
        <h2 className="mb-2 text-xl font-bold text-white">
          Class Blindspot Radar
        </h2>
        <p className="text-slate-400">
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
      <div className="absolute -right-12 -top-12 h-64 w-64 animate-pulse rounded-full bg-red-500/20 blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <span className="ec-label-tech text-red-400">CLASS BLINDSPOT DETECTED</span>
        </div>

        <h2 className="mb-3 text-4xl font-bold text-white">
          {topBlindspot.name}
        </h2>
        <p className="mb-6 text-slate-400">
          Syllabus code{' '}
          <span className="font-mono text-white">{topBlindspot.code}</span> (
          {topBlindspot.paper}) — class average is at{' '}
          <span className="font-bold text-red-400">
            {topBlindspot.avgMastery.toFixed(0)}%
          </span>{' '}
          across {topBlindspot.studentsAttempted} students.
        </p>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Mastery</span>
            <span>{topBlindspot.avgMastery.toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400"
              style={{ width: `${topBlindspot.avgMastery}%` }}
            />
          </div>
        </div>

        {blindspots.length > 1 && (
          <div className="mb-6">
            <div className="mb-2 text-xs text-slate-400">OTHER FAILING TOPICS</div>
            <div className="flex flex-wrap gap-2">
              {blindspots.slice(1, 5).map((bs) => (
                <span
                  key={bs.code}
                  className="rounded-full border border-red-800/50 bg-red-950/40 px-3 py-1 text-sm text-red-300"
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
