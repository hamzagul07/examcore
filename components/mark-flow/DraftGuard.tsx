'use client'

import { useEffect } from 'react'

/** Warn before leaving with an unsaved capture draft. */
export function DraftGuard({ dirty }: { dirty: boolean }) {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  return null
}
