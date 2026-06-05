import { Route } from 'lucide-react'
import type { VisualStep } from '@/lib/courses/visual-types'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function LearningPathBar({ title, steps }: { title: string; steps: VisualStep[] }) {
  return (
    <VisualSectionFrame
      title={title}
      hint="Follow the path from start to finish — you are always one step away from the next idea."
      icon={Route}
      accent="brand"
      className="course-learning-path hidden md:block"
      bodyClassName="!p-0"
    >
      <div className="course-learning-path-track m-3 mt-0">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {steps.map((step, i) => (
            <div key={step.label} className="flex shrink-0 items-center gap-2">
              <div className="course-learning-path-step flex min-w-[7.5rem] max-w-[10rem] flex-col items-center px-3 py-2.5 text-center">
                <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--ec-brand)] bg-[var(--ec-brand)] text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-[var(--ec-text-secondary)]">
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <span className="text-lg text-[var(--ec-text-tertiary)]" aria-hidden>
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </VisualSectionFrame>
  )
}
