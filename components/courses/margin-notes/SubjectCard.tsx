'use client'

import Link from 'next/link'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { Ring } from '@/components/courses/margin-notes/Ring'

/**
 * Premium subject card — accent-gradient header with an oversized faded glyph
 * watermark, stat row and CTA. Shared by the /courses catalog and the /subjects
 * directory so both read as one polished, ZNotes-beating grid.
 */
export function SubjectCard({
  s,
  href = `/courses/${s.code}`,
  boardLabel = 'CAIE',
}: {
  s: MarginNotesSubject
  href?: string
  boardLabel?: string
}) {
  const started = s.prog > 0
  return (
    <Link
      className="scard"
      style={{ '--acc': accentCssVar(s.acc) } as React.CSSProperties}
      href={href}
      data-screen-label={`Subject — ${s.name} card`}
    >
      <div className="scard-top">
        <span className="scard-watermark" aria-hidden>
          {s.glyph}
        </span>
        <span className="scard-glyph">{s.glyph}</span>
        <span className="scard-tab">{s.code}</span>
        {started ? (
          <Ring pct={s.prog} size={40} stroke={3.5} color="var(--acc)" />
        ) : (
          <span className="stamp-free">
            FREE
            <br />
            FOREVER
          </span>
        )}
      </div>
      <div className="scard-body">
        <h3 className="scard-name">{s.name}</h3>
        <p className="scard-meta">
          {s.level} · {boardLabel} · {s.units} units
        </p>
        <p className="scard-stat">
          {s.lessons} lessons · {s.q} past-paper questions
        </p>
      </div>
      <div className="scard-foot">
        <span className="scard-rule" />
        <span className="scard-go">{started ? `${s.prog}% covered` : 'Start free'} →</span>
      </div>
    </Link>
  )
}
