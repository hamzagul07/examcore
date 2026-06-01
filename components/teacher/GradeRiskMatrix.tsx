'use client'

import type { StudentQuadrantMetric } from '@/lib/teacher-analytics'
import { QuadrantTooltip } from './QuadrantTooltip'
import { useState } from 'react'
import { motion } from 'framer-motion'

const QUADRANT_CONFIG = {
  safe: { label: 'Safe Zone', dotClass: 'bg-[var(--ec-brand)] shadow-[0_0_8px_color-mix(in_srgb,var(--ec-brand)_50%,transparent)]' },
  pacing_risk: {
    label: 'Pacing Risk',
    dotClass:
      'bg-[var(--ec-chip-warning-text)] shadow-[0_0_8px_color-mix(in_srgb,var(--ec-chip-warning-text)_50%,transparent)]',
  },
  careless_risk: {
    label: 'Careless Risk',
    dotClass:
      'bg-[color-mix(in_srgb,var(--ec-chip-warning-text)_45%,var(--ec-chip-critical-text))] shadow-[0_0_8px_color-mix(in_srgb,var(--ec-chip-critical-text)_35%,transparent)]',
  },
  under_prepared: {
    label: 'Under-Prepared',
    dotClass:
      'bg-[var(--ec-chip-critical-text)] shadow-[0_0_8px_color-mix(in_srgb,var(--ec-chip-critical-text)_50%,transparent)]',
  },
} as const

export function GradeRiskMatrix({ students }: { students: StudentQuadrantMetric[] }) {
  const [hoveredStudent, setHoveredStudent] = useState<StudentQuadrantMetric | null>(
    null
  )

  if (students.length === 0) {
    return (
      <div className="ec-card p-8">
        <div className="ec-label-tech mb-2">RISK MATRIX</div>
        <h2 className="text-3xl font-bold text-[var(--ec-text-primary)]">Grade Boundary Risk</h2>
        <p className="mt-4 text-[var(--ec-text-secondary)]">
          Add students to this classroom to see the risk matrix.
        </p>
      </div>
    )
  }

  return (
    <div className="ec-card p-8">
      <div className="mb-6">
        <div className="ec-label-tech mb-2">RISK MATRIX</div>
        <h2 className="text-3xl font-bold text-[var(--ec-text-primary)]">Grade Boundary Risk</h2>
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
          Each dot is a student. Hover for predicted grade and biggest deficit.
        </p>
      </div>

      <div className="relative h-96 overflow-hidden rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)]">
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <QuadrantBg label={QUADRANT_CONFIG.careless_risk.label} />
          <QuadrantBg label={QUADRANT_CONFIG.safe.label} />
          <QuadrantBg label={QUADRANT_CONFIG.under_prepared.label} />
          <QuadrantBg label={QUADRANT_CONFIG.pacing_risk.label} />
        </div>

        <div className="absolute bottom-0 left-1/2 top-0 w-px bg-[var(--ec-surface-raised)]" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[var(--ec-surface-raised)]" />

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[var(--ec-text-secondary)]">
          ← Slow · Fast →
        </div>
        <div className="absolute left-2 top-1/2 origin-left -translate-y-1/2 -rotate-90 text-xs text-[var(--ec-text-secondary)]">
          Low ← Accuracy → High
        </div>

        {students.map((student, idx) => {
          const xPercent = Math.min(
            95,
            Math.max(5, 100 - (student.timePerMark / 3) * 100)
          )
          const yPercent = Math.min(95, Math.max(5, 100 - student.accuracy))
          const cfg = QUADRANT_CONFIG[student.quadrant]

          return (
            <motion.button
              key={student.studentId}
              type="button"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: (idx % 12) * 0.04 }}
              whileHover={{ scale: 1.5, zIndex: 10 }}
              onMouseEnter={() => setHoveredStudent(student)}
              onMouseLeave={() => setHoveredStudent(null)}
              className={`absolute h-4 w-4 rounded-full shadow-[0_0_12px_currentColor] transition-transform ${cfg.dotClass}`}
              style={{
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                transform: 'translate(-50%, -50%)',
              }}
              aria-label={student.name}
            />
          )
        })}

        {hoveredStudent && <QuadrantTooltip student={hoveredStudent} />}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          Object.entries(QUADRANT_CONFIG) as Array<
            [keyof typeof QUADRANT_CONFIG, (typeof QUADRANT_CONFIG)[keyof typeof QUADRANT_CONFIG]]
          >
        ).map(([key, cfg]) => {
          const count = students.filter((s) => s.quadrant === key).length
          return (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg bg-[var(--ec-surface-raised)] p-3"
            >
              <div className={`h-3 w-3 rounded-full ${cfg.dotClass.split(' ')[0]}`} />
              <div>
                <div className="text-xs text-[var(--ec-text-secondary)]">{cfg.label}</div>
                <div className="text-lg font-bold text-[var(--ec-text-primary)]">{count}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuadrantBg({ label }: { label: string }) {
  return (
    <div className="relative p-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--ec-text-secondary)]">
        {label}
      </div>
    </div>
  )
}
