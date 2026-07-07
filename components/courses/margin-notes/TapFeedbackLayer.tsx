'use client'

import { useEffect, useRef } from 'react'
import { COURSE_TAP_CONFIG, useTapFeedback, type TapFeedbackConfig } from '@/lib/hooks/useTapFeedback'

/** Attach tap feedback to an existing server-rendered root element. */
export function TapFeedbackLayer({
  rootSelector,
  config = COURSE_TAP_CONFIG,
}: {
  rootSelector: string
  config?: TapFeedbackConfig
}) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    ref.current = document.querySelector(rootSelector)
  }, [rootSelector])

  useTapFeedback(ref, config)
  return null
}
