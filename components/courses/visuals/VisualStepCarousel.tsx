'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ListOrdered } from 'lucide-react'
import type { VisualStep } from '@/lib/courses/visual-types'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function VisualStepCarousel({ title, steps }: { title: string; steps: VisualStep[] }) {
  const [idx, setIdx] = useState(0)
  const step = steps[idx]
  const total = steps.length

  return (
    <VisualSectionFrame
      title={title}
      hint="Swipe through each step — use the arrows or dots below."
      icon={ListOrdered}
      accent="brand"
      className="course-visual-carousel lg:hidden"
      bodyClassName="!pt-2"
    >
      <div className="mb-3 flex items-center justify-end">
        <span className="rounded-full border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--ec-text-tertiary)]">
          Step {idx + 1} of {total}
        </span>
      </div>

      <div className="course-visual-carousel-panel">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="min-h-[140px] border-b-2 border-[var(--ec-border-subtle)] px-6 py-6"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ec-brand)]">
              {step.label}
            </p>
            <div className="text-base leading-relaxed text-[var(--ec-text-secondary)]">
              <CourseRichText content={step.detail} variant="prose" />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between px-4 py-3">
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
                className={`h-2.5 rounded-full border-2 transition-all ${
                  i === idx
                    ? 'w-7 border-[var(--ec-brand)] bg-[var(--ec-brand)]'
                    : 'w-2.5 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)]'
                }`}
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
    </VisualSectionFrame>
  )
}
