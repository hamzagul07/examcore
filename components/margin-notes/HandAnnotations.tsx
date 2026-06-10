import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const INK_STROKE = 'var(--ec-brand)'

export function InkCircle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('ec-ink-circled', className)}>
      {children}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
        <path
          d="M8,22 C10,8 38,2 58,4 C82,6 96,12 95,22 C94,33 70,38 46,37 C22,36 5,32 8,20"
          fill="none"
          stroke={INK_STROKE}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function InkScribble({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('ec-ink-scribbled', className)}>
      {children}
      <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
        <path
          d="M2,6 C20,2 45,8 62,5 C78,2 92,6 98,4"
          fill="none"
          stroke={INK_STROKE}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

type MarginNoteProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  flip?: boolean
}

export function MarginNote({ children, className, style, flip }: MarginNoteProps) {
  return (
    <span className={cn('ec-margin-note', className)} style={style}>
      {children}
      <svg
        width="60"
        height="34"
        viewBox="0 0 60 34"
        aria-hidden
        style={{
          display: 'block',
          marginTop: 2,
          overflow: 'visible',
          transform: flip ? 'scaleX(-1)' : undefined,
        }}
      >
        <path
          d="M50,2 C40,18 25,26 6,30"
          fill="none"
          stroke={INK_STROKE}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M13,24 L5,31 L15,32"
          fill="none"
          stroke={INK_STROKE}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
