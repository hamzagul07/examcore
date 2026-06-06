'use client'

import { useState } from 'react'
import { CircleHelp, Eye, EyeOff } from 'lucide-react'
import type { QuickCheckItem } from '@/lib/courses/visual-types'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function QuickCheckPanel({ title, items }: { title: string; items: QuickCheckItem[] }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})

  return (
    <VisualSectionFrame
      title={title}
      hint="Try answering in your head first — then tap to check. No pressure!"
      icon={CircleHelp}
      accent="success"
      className="course-quick-check"
    >
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {items.map((item, i) => {
          const show = revealed[i]
          return (
            <article key={item.prompt} className="course-quick-check-card flex flex-col p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ec-text-tertiary)]">
                Question {i + 1}
              </p>
              <p className="mb-3 flex-1 text-sm font-medium text-[var(--ec-text-primary)]">
                {item.prompt}
              </p>
              <div
                className={`course-quick-check-answer mb-3 px-3 py-2.5 text-sm leading-relaxed transition-all ${
                  show ? 'is-revealed text-[var(--ec-text-secondary)]' : 'text-transparent blur-sm select-none'
                }`}
                aria-hidden={!show}
              >
                {item.answer}
              </div>
              <button
                type="button"
                onClick={() => setRevealed((r) => ({ ...r, [i]: !show }))}
                className="inline-flex items-center gap-2 self-start rounded-lg border border-[var(--ec-border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-brand)] hover:bg-[var(--ec-surface-muted)]"
              >
                {show ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                    Hide answer
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    Tap to reveal
                  </>
                )}
              </button>
            </article>
          )
        })}
      </div>
    </VisualSectionFrame>
  )
}
