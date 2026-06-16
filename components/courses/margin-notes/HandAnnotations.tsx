'use client'

import type { CSSProperties, ReactNode } from 'react'

export function InkCircle({ children }: { children: ReactNode }) {
  return (
    <span className="circled">
      {children}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <path
          d="M8,22 C10,8 38,2 58,4 C82,6 96,12 95,22 C94,33 70,38 46,37 C22,36 5,32 8,20"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function InkScribble({ children }: { children: ReactNode }) {
  return (
    <span className="scribbled">
      {children}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
        <path
          d="M2,6 C20,2 45,8 62,5 C78,2 92,6 98,4"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function MarginNote({
  style,
  className,
  children,
}: {
  style?: CSSProperties
  className?: string
  children: ReactNode
}) {
  return (
    <span className={className ? `margin-note ${className}` : 'margin-note'} style={style}>
      {children}
    </span>
  )
}
