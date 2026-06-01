'use client'

import { useCallback, useState } from 'react'

/**
 * Runs an async handler with pending state set synchronously on invoke
 * so loading UI can paint before await boundaries.
 */
export function useAsyncAction<T extends unknown[]>(
  handler: (...args: T) => Promise<void> | void
) {
  const [pending, setPending] = useState(false)

  const run = useCallback(
    (...args: T) => {
      setPending(true)
      void Promise.resolve(handler(...args)).finally(() => {
        setPending(false)
      })
    },
    [handler]
  )

  return { pending, run, setPending }
}
