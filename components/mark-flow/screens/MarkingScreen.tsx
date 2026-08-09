'use client'

import type { ReactNode } from 'react'
import {
  MARK_FLOW_DURATION_PAPER,
  MARK_FLOW_DURATION_SINGLE,
} from '../types'

type Scope = 'one_answer' | 'whole_paper'

type Props = {
  scope: Scope
  children?: ReactNode
  /**
   * When true, render only the header (no outer section).
   * Use when the host must keep a sibling mounted across chrome swaps.
   */
  chromeOnly?: boolean
}

export function MarkingScreenHeader({ scope }: { scope: Scope }) {
  const duration = scope === 'whole_paper' ? MARK_FLOW_DURATION_PAPER : MARK_FLOW_DURATION_SINGLE
  return (
    <header className="mb-6">
      <p className="ms-overline mb-2">Marking</p>
      <h2 id="mark-flow-marking-title" className="ms-mark-hero-title">
        Under the scheme
      </h2>
      <p className="ms-mark-hero-lead" role="status" aria-live="polite">
        Usually {duration}. Keep this tab open — you can cancel from the wait panel if needed.
      </p>
    </header>
  )
}

/** Marking state chrome — host supplies the live progress surface (R1). */
export function MarkingScreen({ scope, children, chromeOnly = false }: Props) {
  if (chromeOnly) {
    return <MarkingScreenHeader scope={scope} />
  }
  return (
    <section
      className="ms-mark-flow-screen ms-mark-flow-marking"
      aria-labelledby="mark-flow-marking-title"
      aria-busy="true"
    >
      <MarkingScreenHeader scope={scope} />
      {children}
    </section>
  )
}
