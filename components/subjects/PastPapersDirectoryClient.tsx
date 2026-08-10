'use client'

import Link from 'next/link'
import { useMemo, type CSSProperties } from 'react'
import type { PastPaperSubject } from '@/lib/seo/past-papers'
import { getSubjectColor } from '@/lib/design-system/subject-accents'
import { usePreferredSubjectCodes } from '@/lib/subjects/use-preferred-subject-codes'
import { splitPreferredSubjects } from '@/lib/subjects/prefer-codes'

const LEVEL_ORDER = ['A-Level', 'AS & A-Level', 'O-Level', 'IGCSE', 'Cambridge']

function groupByLevel(subjects: PastPaperSubject[]): [string, PastPaperSubject[]][] {
  const groups = new Map<string, PastPaperSubject[]>()
  for (const s of subjects) {
    const list = groups.get(s.level) ?? []
    list.push(s)
    groups.set(s.level, list)
  }
  return [...groups.entries()].sort(
    (a, b) => LEVEL_ORDER.indexOf(a[0]) - LEVEL_ORDER.indexOf(b[0])
  )
}

function SubjectCard({ s }: { s: PastPaperSubject }) {
  const accent = getSubjectColor(s.code) || 'var(--ec-brand)'
  return (
    <li>
      <Link
        href={`/past-papers/${s.code}`}
        className="ms-pp-card subject-accented"
        style={{ '--acc': accent } as CSSProperties}
      >
        <span className="ms-pp-glyph" aria-hidden>
          {s.code}
        </span>
        <span className="min-w-0 flex-1">
          <span className="ms-pp-title">{s.label}</span>
          <span className="ms-pp-meta">
            {s.yearRange} · {s.componentCount} papers
          </span>
        </span>
        <span className="ms-pp-cta" aria-hidden>
          -&gt;
        </span>
      </Link>
    </li>
  )
}

export function PastPapersDirectoryClient({
  subjects,
}: {
  subjects: PastPaperSubject[]
}) {
  const preferredCodes = usePreferredSubjectCodes()
  const { yours, rest } = useMemo(
    () => splitPreferredSubjects(subjects, preferredCodes, (s) => s.code),
    [subjects, preferredCodes]
  )
  const grouped = useMemo(() => groupByLevel(rest), [rest])

  return (
    <>
      {yours.length > 0 ? (
        <section style={{ marginTop: 40 }} aria-labelledby="pp-yours">
          <h2 id="pp-yours" className="ms-h3" style={{ marginBottom: 16 }}>
            Your subjects
          </h2>
          <ul className="ms-pp-grid">
            {yours.map((s) => (
              <SubjectCard key={s.code} s={s} />
            ))}
          </ul>
        </section>
      ) : null}

      {grouped.map(([level, list]) => (
        <section key={level} style={{ marginTop: 40 }} aria-labelledby={`lvl-${level}`}>
          <h2 id={`lvl-${level}`} className="ms-h3" style={{ marginBottom: 16 }}>
            {level} past papers
          </h2>
          <ul className="ms-pp-grid">
            {list.map((s) => (
              <SubjectCard key={s.code} s={s} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
