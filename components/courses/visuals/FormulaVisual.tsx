'use client'

import { useState } from 'react'
import { Sigma } from 'lucide-react'
import type { FormulaPart } from '@/lib/courses/visual-types'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

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
    <VisualSectionFrame
      title="Key formula"
      hint="Tap each symbol to see what it means — great for exam definitions."
      icon={Sigma}
      accent="warm"
      className="course-formula-visual"
    >
      <div className="course-formula-box">
        <p className="mb-4 text-center font-mono text-3xl font-semibold tracking-wide text-[var(--ec-text-primary)]">
          {expression}
        </p>
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {parts.map((p, i) => (
            <button
              key={p.symbol}
              type="button"
              onClick={() => setActive(i)}
              className={`course-formula-chip rounded-full px-4 py-1.5 font-mono text-sm font-semibold transition-colors ${
                active === i
                  ? 'is-active bg-[var(--ec-brand)] text-white'
                  : 'bg-[var(--ec-surface-raised)] text-[var(--ec-text-primary)]'
              }`}
            >
              {p.symbol}
            </button>
          ))}
        </div>
        <div
          className="course-formula-meaning px-4 py-3 text-center text-sm leading-relaxed text-[var(--ec-text-secondary)]"
          style={{ borderLeftColor: part?.color ?? 'var(--ec-brand)' }}
        >
          <span className="font-semibold text-[var(--ec-text-primary)]">{part?.symbol}</span>
          {' = '}
          {part?.meaning}
        </div>
      </div>
    </VisualSectionFrame>
  )
}
