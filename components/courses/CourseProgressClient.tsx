'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import {
  COURSE_PROGRESS_CHANGED,
  COURSE_LAST_LESSON_CHANGED,
} from '@/lib/courses/margin-notes/continue-learning'

const STORAGE_KEY = 'markscheme-course-progress'

type ProgressMap = Record<string, Record<string, boolean>>

function readProgress(): ProgressMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

function writeProgress(map: ProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function notifyProgressChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(COURSE_PROGRESS_CHANGED))
}

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

export function useCourseProgress(subjectCode: string) {
  const [done, setDone] = useState<Set<string>>(new Set())

  useEffect(() => {
    const sync = () => {
      const map = readProgress()
      const subject = map[subjectCode] ?? {}
      setDone(new Set(Object.keys(subject).filter((k) => subject[k])))
    }
    sync()
    window.addEventListener(COURSE_PROGRESS_CHANGED, sync)
    return () => window.removeEventListener(COURSE_PROGRESS_CHANGED, sync)
  }, [subjectCode])

  const toggle = useCallback(
    (lessonSlug: string, completed: boolean) => {
      const map = readProgress()
      if (!map[subjectCode]) map[subjectCode] = {}
      map[subjectCode][lessonSlug] = completed
      writeProgress(map)
      setDone((prev) => {
        const next = new Set(prev)
        if (completed) next.add(lessonSlug)
        else next.delete(lessonSlug)
        return next
      })
      notifyProgressChanged()
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
        Saved on this device — sign in later for cloud sync.
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
