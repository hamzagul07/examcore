'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'
import { QASection } from '@/components/community/QASection'

type Props = {
  board: 'cambridge' | 'ib'
  subjectCode: string
  subjectName?: string
  questionId?: string | null
  accent?: string
}

/** Doubts anchored to a specific past-paper question (or subject fallback). */
export function PaperDoubtThread({
  board,
  subjectCode,
  subjectName,
  questionId,
  accent,
}: Props) {
  return (
    <section className="community-notes paper-doubt-thread" style={{ '--sc': accent } as CSSProperties}>
      <div className="community-head">
        <div>
          <h2 className="ms-h3">Ask the room</h2>
          <p className="community-sub">
            Stuck on this question? Ask students who&apos;ve revised the same paper.
          </p>
        </div>
        {questionId ? (
          <Link
            href={`/community?ask=1&question=${questionId}&subject=${subjectCode}`}
            className="ec-btn-primary community-contribute"
          >
            Ask about this question
          </Link>
        ) : null}
      </div>
      <QASection
        board={board}
        subjectCode={subjectCode}
        subjectName={subjectName ?? subjectCode}
        accent={accent}
        questionId={questionId}
        askOpen={!!questionId}
      />
    </section>
  )
}
