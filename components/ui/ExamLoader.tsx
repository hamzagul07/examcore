'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const ROTATING_HINTS = [
  'Opening…',
  'Finding mark scheme…',
  'Checking working…',
  'Almost there…',
] as const

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<Size, string> = {
  sm: 'ec-exam-loader--sm',
  md: 'ec-exam-loader--md',
  lg: 'ec-exam-loader--lg',
}

type Props = {
  size?: Size
  label?: string
  /** Cycle through marking-themed hints while loading. */
  rotateHints?: boolean
  className?: string
}

export function ExamLoader({
  size = 'md',
  label,
  rotateHints = false,
  className,
}: Props) {
  const [hintIndex, setHintIndex] = useState(0)
  const displayLabel = label ?? (rotateHints ? ROTATING_HINTS[hintIndex] : 'Loading…')

  useEffect(() => {
    if (!rotateHints || label) return
    const id = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % ROTATING_HINTS.length)
    }, 1400)
    return () => window.clearInterval(id)
  }, [rotateHints, label])

  return (
    <div
      className={cn('ec-exam-loader', SIZE_CLASS[size], className)}
      role="status"
      aria-live="polite"
      aria-label={displayLabel}
    >
      <div className="ec-exam-loader-orbit" aria-hidden>
        <span className="ec-exam-loader-dot ec-exam-loader-dot--math" />
        <span className="ec-exam-loader-dot ec-exam-loader-dot--brand" />
        <span className="ec-exam-loader-dot ec-exam-loader-dot--phys" />
        <span className="ec-exam-loader-dot ec-exam-loader-dot--chem" />
        <span className="ec-exam-loader-core">✎</span>
      </div>
      {displayLabel ? (
        <p className="ec-exam-loader-label" key={displayLabel}>
          {displayLabel}
        </p>
      ) : null}
    </div>
  )
}
