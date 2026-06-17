'use client'

import { useRef, type ReactNode } from 'react'
import { COURSE_TAP_CONFIG, useTapFeedback } from '@/lib/hooks/useTapFeedback'

export function TapFeedbackRoot({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useTapFeedback(ref, COURSE_TAP_CONFIG)
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
