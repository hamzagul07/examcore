'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import type { PaperTrackWithStats } from '@/lib/courses/paper-tracks'

type Props = {
  subjectCode: string
  tracks: PaperTrackWithStats[]
  selectedNumber?: string | null
  compact?: boolean
}

function storageKey(subjectCode: string) {
  return `course-paper:${subjectCode}`
}

export function CoursePaperPicker({
  subjectCode,
  tracks,
  selectedNumber,
  compact = false,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function selectPaper(number: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey(subjectCode), number)
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('paper', number)
    router.push(`/courses/${subjectCode}?${params.toString()}`, { scroll: false })
  }

  if (tracks.length <= 1) return null

  if (compact) {
    return (
      <div className="course-paper-switcher" role="group" aria-label="Exam paper">
        {tracks.map((track) => {
          const isActive = selectedNumber === track.number
          return (
            <button
              key={track.id}
              type="button"
              className={`course-paper-switcher-btn${isActive ? ' is-active' : ''}`}
              aria-pressed={isActive}
              onClick={() => selectPaper(track.number)}
            >
              {track.shortName}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <section className="course-paper-picker" aria-labelledby="course-paper-picker-title">
      <div className="mb-5">
        <h2 id="course-paper-picker-title" className="course-studio-section-title">
          Choose your paper
        </h2>
        <p className="course-studio-prose m-0 text-[0.95rem]">
          Cambridge {subjectCode} is examined across separate papers. Pick the paper you are
          studying — topics and practice questions will be filtered to match.
        </p>
      </div>

      <div className="course-paper-picker-grid">
        {tracks.map((track) => {
          const isActive = selectedNumber === track.number
          const href = `/courses/${subjectCode}?paper=${encodeURIComponent(track.number)}`

          return (
            <Link
              key={track.id}
              href={href}
              className={`course-paper-card group no-underline${isActive ? ' is-active' : ''}`}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(storageKey(subjectCode), track.number)
                }
              }}
            >
              <div className="course-paper-card-head">
                <span className="course-paper-card-icon" aria-hidden>
                  <BookOpen className="h-5 w-5" />
                </span>
                {isActive ? (
                  <CheckCircle2
                    className="course-paper-card-check h-5 w-5"
                    aria-label="Selected"
                  />
                ) : null}
              </div>
              <h3 className="course-paper-card-title">{track.shortName}</h3>
              <p className="course-paper-card-subtitle">{track.subtitle}</p>
              <p className="course-paper-card-meta">
                {track.topicCount} topic{track.topicCount === 1 ? '' : 's'}
                {track.premiumCount > 0
                  ? ` · ${track.premiumCount} premium`
                  : ' · syllabus outlines'}
              </p>
              <span className="course-paper-card-cta">
                {isActive ? 'Studying this paper' : 'Study this paper'}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
