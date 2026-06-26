'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  COURSE_LAST_LESSON_CHANGED,
  COURSE_PROGRESS_CHANGED,
} from '@/lib/courses/course-progress-storage'
import { runCourseProgressSyncOnce, scheduleCloudProgressPush } from '@/lib/courses/course-progress-cloud'

/**
 * Merges device progress with Supabase for signed-in users.
 * Mount on course and dashboard surfaces that read progress.
 */
export function CourseProgressCloudSync() {
  useEffect(() => {
    let cancelled = false

    async function init() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      try {
        await runCourseProgressSyncOnce()
      } catch {
        /* local progress still works offline */
      }
    }

    void init()

    const onChange = () => scheduleCloudProgressPush()
    window.addEventListener(COURSE_PROGRESS_CHANGED, onChange)
    window.addEventListener(COURSE_LAST_LESSON_CHANGED, onChange)

    return () => {
      cancelled = true
      window.removeEventListener(COURSE_PROGRESS_CHANGED, onChange)
      window.removeEventListener(COURSE_LAST_LESSON_CHANGED, onChange)
    }
  }, [])

  return null
}
