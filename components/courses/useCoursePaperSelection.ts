'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  filterLessonsByPaper,
  findPaperTrack,
  getPaperTracks,
  type PaperTrackWithStats,
} from '@/lib/courses/paper-tracks'
import type { CourseLessonNav } from '@/lib/courses/lesson-nav'

function storageKey(subjectCode: string) {
  return `course-paper:${subjectCode}`
}

export function useCoursePaperSelection(subjectCode: string, lessons: CourseLessonNav[]) {
  const searchParams = useSearchParams()
  const tracks = useMemo(() => getPaperTracks(subjectCode, lessons), [subjectCode, lessons])
  const urlPaper = searchParams.get('paper')
  const [storedPaper, setStoredPaper] = useState<string | null>(null)

  useEffect(() => {
    if (urlPaper) return
    try {
      const saved = window.localStorage.getItem(storageKey(subjectCode))
      if (saved) setStoredPaper(saved)
    } catch {
      /* ignore */
    }
  }, [subjectCode, urlPaper])

  const selectedNumber = urlPaper ?? storedPaper ?? (tracks.length === 1 ? tracks[0]?.number : null)

  const activeTrack: PaperTrackWithStats | null = useMemo(
    () => findPaperTrack(subjectCode, lessons, selectedNumber) ?? tracks[0] ?? null,
    [subjectCode, lessons, selectedNumber, tracks]
  )

  const filteredLessons = useMemo(
    () => filterLessonsByPaper(lessons, activeTrack),
    [lessons, activeTrack]
  )

  const hasPaperChoice = tracks.length > 1

  return {
    tracks,
    activeTrack,
    selectedNumber: activeTrack?.number ?? null,
    filteredLessons,
    hasPaperChoice,
  }
}
