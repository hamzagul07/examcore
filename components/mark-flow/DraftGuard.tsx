'use client'

import { useEffect } from 'react'

type Props = {
  dirty: boolean
}

/** Warn before unload when the capture draft has unsaved work (R1 / MK-03). */
export function DraftGuard({ dirty }: Props) {
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return null
}
