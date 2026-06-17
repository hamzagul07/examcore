'use client'

import { useRef, type ReactNode } from 'react'
import { useTapFeedback } from '@/lib/hooks/useTapFeedback'

export function TapFeedbackRoot({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useTapFeedback(ref)
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
