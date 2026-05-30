'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useOmniAI } from '@/lib/omni-ai/context'

/** Opens Omni with marking context when `?attempt_id=` is present in the URL. */
export function useOmniAttemptQueryParam() {
  const searchParams = useSearchParams()
  const { setContext, setIsOpen } = useOmniAI()

  useEffect(() => {
    const attemptId = searchParams.get('attempt_id')?.trim()
    if (!attemptId) return
    setContext({ type: 'marking_result', data: { attemptId } })
    setIsOpen(true)
  }, [searchParams, setContext, setIsOpen])
}
