'use client'

import { useEffect, useRef } from 'react'
import { postFeedbackRead } from '@/lib/student/feedback-read'

/**
 * Marks the teacher notes shown on the set page as read, once, after they
 * have rendered (docs/TEACHER_SYSTEM_SPEC.md §4). Renders nothing.
 */
export function MarkFeedbackRead({ ids }: { ids: string[] }) {
  const sentRef = useRef(false)
  const key = ids.join(',')
  useEffect(() => {
    if (sentRef.current || !key) return
    sentRef.current = true
    void postFeedbackRead(key.split(','))
  }, [key])
  return null
}
