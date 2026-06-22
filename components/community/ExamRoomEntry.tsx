import Link from 'next/link'
import type { CSSProperties } from 'react'

type Props = {
  subjectCode: string
  subjectName: string
  noteCount: number
  questionCount: number
  accent?: string
}

export function ExamRoomEntry({
  subjectCode,
  subjectName,
  noteCount,
  questionCount,
  accent = 'var(--ec-brand)',
}: Props) {
  const total = noteCount + questionCount
  return (
    <section
      className="ms-sd-card ms-sd-card-pad exam-room-entry"
      style={{ '--sc': accent, marginTop: 40 } as CSSProperties}
    >
      <p className="ms-overline" style={{ marginBottom: 6 }}>
        Exam Room
      </p>
      <h2 className="ms-h3" style={{ fontSize: 20, marginBottom: 6 }}>
        {subjectName} community
      </h2>
      <p className="ms-body-2" style={{ margin: '0 0 16px' }}>
        {total > 0
          ? `${questionCount} doubts · ${noteCount} cheat sheets from students revising ${subjectCode}.`
          : `Be the first to ask a doubt or share a cheat sheet for ${subjectCode}.`}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href={`/community?subject=${subjectCode}`} className="ec-btn-primary text-sm">
          Open Exam Room →
        </Link>
        <Link href="/community/guidelines" className="ec-btn-ghost text-sm">
          Guidelines
        </Link>
      </div>
    </section>
  )
}
