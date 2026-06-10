'use client'

import { ListOrdered } from 'lucide-react'
import type { VisualStep } from '@/lib/courses/visual-types'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function VisualStepTimeline({
  title,
  steps,
  activeStep,
  onStepChange,
}: {
  title: string
  steps: VisualStep[]
  activeStep: number
  onStepChange: (index: number) => void
}) {
  return (
    <VisualSectionFrame
      title={title}
      hint="Click any step — the diagram updates to match."
      icon={ListOrdered}
      accent="brand"
      className="course-step-timeline hidden lg:block"
      bodyClassName="!pt-2"
    >
      <ol className="space-y-0">
        {steps.map((step, i) => {
          const isActive = i === activeStep
          const isLast = i === steps.length - 1
          return (
            <li key={step.label} className="relative flex gap-4">
              {!isLast ? (
                <span
                  className="absolute left-[17px] top-9 h-[calc(100%-12px)] w-0.5 border-l-2 border-[var(--ec-border-subtle)]"
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                onClick={() => onStepChange(i)}
                className={`course-step-dot relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  isActive
                    ? 'is-active bg-[var(--ec-brand)] text-white'
                    : 'bg-[var(--ec-surface-raised)] text-[var(--ec-text-tertiary)]'
                }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {i + 1}
              </button>
              <div
                className={`course-step-timeline-card mb-3 flex-1 px-4 py-3 text-left ${
                  isActive ? 'is-active' : ''
                }`}
              >
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ec-brand)]">
                  {step.label}
                </p>
                <div className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                  <CourseRichText content={step.detail} variant="prose" />
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </VisualSectionFrame>
  )
}
