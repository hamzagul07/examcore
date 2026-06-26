'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  COURSE_PROGRESS_CHANGED,
  COURSE_LAST_LESSON_CHANGED,
  readLocalProgress,
  writeLocalProgress,
} from '@/lib/courses/course-progress-storage'
import { scheduleCloudProgressPush } from '@/lib/courses/course-progress-cloud'

/** Bump when local course progress changes — keeps catalog/hub rings in sync. */
export function useCourseProgressRevision(): number {
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const bump = () => setRevision((r) => r + 1)
    window.addEventListener(COURSE_PROGRESS_CHANGED, bump)
    window.addEventListener(COURSE_LAST_LESSON_CHANGED, bump)
    return () => {
      window.removeEventListener(COURSE_PROGRESS_CHANGED, bump)
      window.removeEventListener(COURSE_LAST_LESSON_CHANGED, bump)
    }
  }, [])

  return revision
}

export function useCourseProgressSignedIn() {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user)
    })
  }, [])

  return signedIn
}

export function useCourseProgress(subjectCode: string) {
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    const sync = () => {
      const map = readLocalProgress()
      const subject = map[subjectCode] ?? {}
      setDone(new Set(Object.keys(subject).filter((k) => subject[k])))
    }
    sync()
    window.addEventListener(COURSE_PROGRESS_CHANGED, sync)
    return () => window.removeEventListener(COURSE_PROGRESS_CHANGED, sync)
  }, [subjectCode])

  const toggle = useCallback(
    (lessonSlug: string, completed: boolean) => {
      const map = readLocalProgress()
      if (!map[subjectCode]) map[subjectCode] = {}
      map[subjectCode][lessonSlug] = completed
      writeLocalProgress(map)
      setDone((prev) => {
        const next = new Set(prev)
        if (completed) next.add(lessonSlug)
        else next.delete(lessonSlug)
        return next
      })
      scheduleCloudProgressPush()
    },
    [subjectCode]
  )

  return { done, toggle, count: done.size }
}

export function CourseProgressBar({
  subjectCode,
  total,
}: {
  subjectCode: string
  total: number
}) {
  const { count } = useCourseProgress(subjectCode)
  const signedIn = useCourseProgressSignedIn()
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="course-studio-progress rounded-xl border border-[var(--course-border,var(--ec-border-subtle))] bg-[var(--course-surface-card,var(--ec-surface-muted))] p-3.5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--ec-text-primary)]">Your progress</span>
        <span className="text-[var(--ec-text-tertiary)]">
          {count}/{total} topics
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--ec-surface-raised)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-[var(--ec-accent)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--ec-text-tertiary)]">
        {signedIn
          ? 'Synced to your account — pick up on any device.'
          : 'Saved on this device — sign in for cloud sync.'}
      </p>
    </div>
  )
}

export function MarkLessonCompleteButton({
  subjectCode,
  lessonSlug,
}: {
  subjectCode: string
  lessonSlug: string
}) {
  const { done, toggle } = useCourseProgress(subjectCode)
  const isDone = done.has(lessonSlug)

  return (
    <button
      type="button"
      onClick={() => toggle(lessonSlug, !isDone)}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
        isDone
          ? 'ec-tint-success-chip border'
          : 'border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] text-[var(--ec-text-secondary)] hover:border-[var(--ec-accent)]'
      }`}
    >
      <Check className={`h-4 w-4 ${isDone ? 'opacity-100' : 'opacity-40'}`} aria-hidden />
      {isDone ? 'Completed' : 'Mark as complete'}
    </button>
  )
}
