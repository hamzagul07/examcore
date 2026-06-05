'use client'

import { useState } from 'react'
import { BookMarked } from 'lucide-react'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function KeyTermsPanel({
  title,
  terms,
}: {
  title: string
  terms: { term: string; definition: string }[]
}) {
  const [active, setActive] = useState(0)
  const term = terms[active]

  return (
    <VisualSectionFrame
      title={title}
      hint="Pick a word on the left — the meaning appears on the right."
      icon={BookMarked}
      accent="brand"
      className="course-key-terms"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border-2 border-dashed border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--ec-text-tertiary)]">
            Tap a term
          </p>
          <div className="flex flex-wrap gap-2">
            {terms.map((t, i) => (
              <button
                key={t.term}
                type="button"
                onClick={() => setActive(i)}
                className={`course-key-term-pill rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active === i
                    ? 'is-active bg-[var(--ec-brand)] text-white'
                    : 'bg-[var(--ec-surface-raised)] text-[var(--ec-text-secondary)] hover:border-[var(--ec-brand)]/40'
                }`}
              >
                {t.term}
              </button>
            ))}
          </div>
        </div>
        <div className="course-key-term-detail p-5">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ec-brand)]">
            Definition
          </p>
          <p className="mb-2 text-xl font-semibold text-[var(--ec-text-primary)]">{term?.term}</p>
          <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">{term?.definition}</p>
        </div>
      </div>
    </VisualSectionFrame>
  )
}
