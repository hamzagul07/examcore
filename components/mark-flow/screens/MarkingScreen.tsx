'use client'

import type { ReactNode } from 'react'
import {
  MARK_DURATION_PAPER,
  MARK_DURATION_SINGLE,
} from '@/lib/copy/product-lexicon'

type Props = {
  scope: 'one_answer' | 'whole_paper'
  /** Host wait UI (cinematic / whole-paper progress). */
  children: ReactNode
}

/** Marking state chrome — host supplies the live progress surface (R1). */
export function MarkingScreen({ scope, children }: Props) {
  const duration = scope === 'whole_paper' ? MARK_DURATION_PAPER : MARK_DURATION_SINGLE
  return (
    <section
      className="ms-mark-flow-screen ms-mark-flow-marking"
      aria-labelledby="mark-flow-marking-title"
      aria-busy="true"
    >
      <header className="mb-6">
        <p className="ms-overline mb-2">Marking</p>
        <h1 id="mark-flow-marking-title" className="ms-mark-hero-title">
          Under the scheme
        </h1>
        <p className="ms-mark-hero-lead" role="status" aria-live="polite">
          Usually {duration}. Keep this tab open — you can cancel from the wait panel if needed.
        </p>
      </header>
      {children}
    </section>
  )
}
