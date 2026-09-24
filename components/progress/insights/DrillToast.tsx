'use client'

import { useEffect, useState } from 'react'
import { PaperToast } from '@/components/ui/PaperToast'

/**
 * Shown once when the student returns from a "Drill this" practice run
 * (/dashboard/progress?drilled=1). Confirms the loop closed and that insights
 * reflect the new mark. Strips the param from the URL so a refresh won't repeat.
 */
export function DrillToast() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('drilled') !== '1') return
    setShow(true)
    url.searchParams.delete('drilled')
    window.history.replaceState(window.history.state, '', url.toString())
  }, [])

  return (
    <PaperToast
      open={show}
      onDismiss={() => setShow(false)}
      stamp="M1"
      title="Updated insights based on your latest mark"
      autoHideMs={6000}
    />
  )
}
