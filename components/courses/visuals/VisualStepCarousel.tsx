'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { VisualStep } from '@/lib/courses/visual-types'

export function VisualStepCarousel({ title, steps }: { title: string; steps: VisualStep[] }) {
  const [idx, setIdx] = useState(0)
  const step = steps[idx]
  const total = steps.length

  return (
    <section className="course-visual-carousel" aria-label={title}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--ec-text-primary)]">{title}</h2>
        <span className="text-xs font-medium text-[var(--ec-text-tertiary)]">
          {idx + 1} / {total}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="min-h-[140px] px-6 py-6"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ec-brand)]">
              {step.label}
            </p>
            <p className="text-base leading-relaxed text-[var(--ec-text-secondary)]">{step.detail}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between border-t border-[var(--ec-border-subtle)] px-4 py-3">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="course-visual-nav-btn"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex gap-1.5" role="tablist" aria-label="Steps">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === idx}
                onClick={() => setIdx(i)}
                className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-[var(--ec-brand)]' : 'w-2 bg-[var(--ec-border-subtle)]'}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            disabled={idx === total - 1}
            className="course-visual-nav-btn"
            aria-label="Next step"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  )
}
