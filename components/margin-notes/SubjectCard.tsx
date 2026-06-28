import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { LandingSubjectPreview } from '@/lib/landing-subjects-preview'

type SubjectCardProps = {
  subject: LandingSubjectPreview
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const lessons = subject.lessons ?? (subject.course ? Math.round(subject.papers * 0.45) : 0)
  const marked = (subject.papers * 73).toLocaleString('en-GB')

  return (
    <div className="ms-scard2" style={{ '--sc': subject.color } as CSSProperties}>
      <div className="ms-tile">
        <span className="ms-tg" aria-hidden>
          {subject.glyph}
        </span>
        <span className="ms-badge">2026 SYLLABUS</span>
      </div>
      <div className="ms-body">
        <h3 className="ms-sname">
          {/* Stretched primary link: covers the whole card via ::after (see .ms-scard-link) */}
          <Link href={`/subjects/${subject.code}`} className="ms-scard-link">
            {subject.name}
          </Link>
        </h3>
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
          <Link href={`/subjects/${subject.code}`}>Past papers →</Link>
          {subject.course ? (
            <Link href={`/courses/${subject.code}`}>Course →</Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
