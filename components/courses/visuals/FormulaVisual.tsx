'use client'

import { useState } from 'react'
import type { FormulaPart } from '@/lib/courses/visual-types'

export function FormulaVisual({
  expression,
  parts,
}: {
  expression: string
  parts: FormulaPart[]
}) {
  const [active, setActive] = useState(0)
  const part = parts[active] ?? parts[0]

  return (
    <section className="course-formula-visual rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ec-text-tertiary)]">
        Interactive formula
      </p>
      <p className="mb-4 text-center font-mono text-3xl font-semibold tracking-wide text-[var(--ec-text-primary)]">
        {expression}
      </p>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {parts.map((p, i) => (
          <button
            key={p.symbol}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full px-4 py-1.5 font-mono text-sm font-semibold transition-colors ${
              active === i
                ? 'bg-[var(--ec-brand)] text-white'
                : 'border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] text-[var(--ec-text-primary)]'
            }`}
          >
            {p.symbol}
          </button>
        ))}
      </div>
      <div
        className="rounded-xl bg-[var(--ec-surface-raised)] px-4 py-3 text-center text-sm leading-relaxed text-[var(--ec-text-secondary)]"
        style={{ borderLeft: `4px solid ${part?.color ?? 'var(--ec-brand)'}` }}
      >
        <span className="font-semibold text-[var(--ec-text-primary)]">{part?.symbol}</span>
        {' — '}
        {part?.meaning}
      </div>
    </section>
  )
}
