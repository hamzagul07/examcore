'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import type { SimpleExplanation } from '@/lib/courses/types'

export function CourseSimpleExplain({ data }: { data: SimpleExplanation }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="course-simple-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-[var(--ec-text-primary)]">
          <Sparkles className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
          Still confused? Explain it in a simpler way
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--ec-text-tertiary)] transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-4 border-t border-dashed border-[var(--ec-border-subtle)] px-5 pb-5 pt-4">
          <p className="text-sm font-medium text-[var(--ec-text-primary)]">{data.title}</p>
          <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">{data.summary}</p>
          {data.analogy ? (
            <p className="rounded-xl bg-[var(--ec-surface-raised)] px-4 py-3 text-sm italic leading-relaxed text-[var(--ec-text-secondary)]">
              {data.analogy}
            </p>
          ) : null}
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {data.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
