'use client'

import type { StudentQuadrantMetric } from '@/lib/teacher-analytics'
import { QuadrantTooltip } from './QuadrantTooltip'
import { useState } from 'react'
import { motion } from 'framer-motion'

const QUADRANT_CONFIG = {
  safe: {
    label: 'Safe zone',
    stamp: 'OK',
    dotClass:
      'bg-[var(--ec-brand)] ring-2 ring-[color-mix(in_srgb,var(--ec-brand)_45%,transparent)]',
  },
  pacing_risk: {
    label: 'Pacing risk',
    stamp: 'PAC',
    dotClass:
      'bg-[var(--ec-chip-warning-text)] ring-2 ring-[color-mix(in_srgb,var(--ec-chip-warning-text)_45%,transparent)]',
  },
  careless_risk: {
    label: 'Careless risk',
    stamp: 'CAR',
    dotClass:
      'bg-[color-mix(in_srgb,var(--ec-chip-warning-text)_45%,var(--ec-chip-critical-text))] ring-2 ring-[color-mix(in_srgb,var(--ec-chip-critical-text)_40%,transparent)]',
  },
  under_prepared: {
    label: 'Under-prepared',
    stamp: 'UP',
    dotClass:
      'bg-[var(--ec-chip-critical-text)] ring-2 ring-[color-mix(in_srgb,var(--ec-chip-critical-text)_45%,transparent)]',
  },
} as const

export function GradeRiskMatrix({ students }: { students: StudentQuadrantMetric[] }) {
  const [activeStudent, setActiveStudent] = useState<StudentQuadrantMetric | null>(null)

  if (students.length === 0) {
    return (
      <div className="ms-teacher-risk-matrix ms-teacher-roster">
        <div className="ec-label-tech mb-2">Risk matrix</div>
        <h2 className="text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
          Grade boundary risk
        </h2>
        <p className="mt-4 text-[var(--ec-text-secondary)]">
          Once students have marked work, each appears here by pace and accuracy.
        </p>
      </div>
    )
  }

  return (
    <div className="ms-teacher-risk-matrix ms-teacher-roster">
      <div className="mb-6">
        <div className="ec-label-tech mb-2">Risk matrix</div>
        <h2 className="text-2xl font-bold text-[var(--ec-text-primary)] sm:text-3xl">
          Grade boundary risk
        </h2>
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
          Each mark is a student. Focus or hover for predicted grade and biggest deficit.
        </p>
      </div>

      <div
        className="ms-teacher-risk-plot relative h-64 overflow-hidden rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] sm:h-80 md:h-96"
        style={{ boxShadow: 'var(--ec-shadow-hard, 4px 4px 0 rgba(0, 0, 0, 0.08))' }}
      >
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <QuadrantBg label={QUADRANT_CONFIG.careless_risk.label} />
          <QuadrantBg label={QUADRANT_CONFIG.safe.label} />
          <QuadrantBg label={QUADRANT_CONFIG.under_prepared.label} />
          <QuadrantBg label={QUADRANT_CONFIG.pacing_risk.label} />
        </div>

        <div className="absolute bottom-0 left-1/2 top-0 w-px bg-[var(--ec-border)]" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[var(--ec-border)]" />

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[var(--ec-text-secondary)]">
          &lt;- Slow · Fast -&gt;
        </div>
        <div className="absolute left-2 top-1/2 origin-left -translate-y-1/2 -rotate-90 text-xs text-[var(--ec-text-secondary)]">
          Low &lt;- Accuracy -&gt; High
        </div>

        {students.map((student, idx) => {
          const xPercent = Math.min(95, Math.max(5, 100 - (student.timePerMark / 3) * 100))
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
              onMouseEnter={() => setActiveStudent(student)}
              onMouseLeave={() => setActiveStudent(null)}
              onFocus={() => setActiveStudent(student)}
              onBlur={() => setActiveStudent(null)}
              className={`absolute h-4 w-4 rounded-[3px] ring-2 ring-current transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ec-brand)] ${cfg.dotClass}`}
              style={{
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                transform: 'translate(-50%, -50%)',
              }}
              aria-label={`${student.name}, ${cfg.label}`}
            />
          )
        })}

        {activeStudent && <QuadrantTooltip student={activeStudent} />}
      </div>

      <div className="ms-teacher-risk-legend mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {(
          Object.entries(QUADRANT_CONFIG) as Array<
            [keyof typeof QUADRANT_CONFIG, (typeof QUADRANT_CONFIG)[keyof typeof QUADRANT_CONFIG]]
          >
        ).map(([key, cfg]) => {
          const count = students.filter((s) => s.quadrant === key).length
          return (
            <div key={key} className="ms-teacher-risk-legend__cell">
              <span className="ms-teacher-risk-legend__stamp" aria-hidden>
                {cfg.stamp}
              </span>
              <div>
                <div className="text-xs text-[var(--ec-text-secondary)]">{cfg.label}</div>
                <div className="font-display text-lg font-medium text-[var(--ec-text-primary)]">
                  {count}
                </div>
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
