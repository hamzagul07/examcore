'use client'

import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  onMarkAnother?: () => void
}

/** Result state chrome — host supplies MarkingResultView / WholePaperResultView (R1). */
export function ResultScreen({ children, onMarkAnother }: Props) {
  return (
    <section
      className="ms-mark-flow-screen ms-mark-flow-result"
      aria-labelledby="mark-flow-result-title"
    >
      <h1 id="mark-flow-result-title" className="sr-only">
        Marking result
      </h1>
      {children}
      {onMarkAnother ? (
        <div className="mt-8">
          <button
            type="button"
            className="ec-btn-primary w-full justify-center sm:w-auto"
            onClick={onMarkAnother}
          >
            Mark another
          </button>
        </div>
      ) : null}
    </section>
  )
}
