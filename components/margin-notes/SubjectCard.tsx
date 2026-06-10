'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import type { LandingSubjectPreview } from '@/lib/landing-subjects-preview'

type SubjectCardProps = {
  subject: LandingSubjectPreview
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const router = useRouter()
  const lessons = subject.lessons ?? (subject.course ? Math.round(subject.papers * 0.45) : 0)
  const marked = (subject.papers * 73).toLocaleString('en-GB')

  return (
    <div
      role="link"
      tabIndex={0}
      className="ms-scard2"
      style={{ '--sc': subject.color } as CSSProperties}
      onClick={() => router.push(`/subjects/${subject.code}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(`/subjects/${subject.code}`)
        }
      }}
    >
      <div className="ms-tile">
        <span className="ms-tg" aria-hidden>
          {subject.glyph}
        </span>
        <span className="ms-badge">2026 SYLLABUS</span>
      </div>
      <div className="ms-body">
        <h3 className="ms-sname">{subject.name}</h3>
        <span className="ms-scode">{subject.code} · CAIE</span>
        <div className="ms-stat-row">
          <span>
            <b>{subject.papers}</b> PAPERS
          </span>
          {subject.course ? (
            <span>
              <b>{lessons}</b> LESSONS
            </span>
          ) : (
            <span>COURSE SOON</span>
          )}
          <span>
            <b>{marked}</b> MARKED
          </span>
        </div>
        <div className="ms-slinks">
          <Link href={`/subjects/${subject.code}`} onClick={(e) => e.stopPropagation()}>
            Past papers →
          </Link>
          {subject.course ? (
            <Link href={`/courses/${subject.code}`} onClick={(e) => e.stopPropagation()}>
              Course →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
