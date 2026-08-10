'use client'

import Link from 'next/link'
import { useMemo, type CSSProperties } from 'react'
import type { IbSubject } from '@/lib/ib/catalog'
import { usePreferredSubjectCodes } from '@/lib/subjects/use-preferred-subject-codes'
import { splitPreferredSubjects } from '@/lib/subjects/prefer-codes'

type Group = {
  group: string
  groupNumber: number
  subjects: IbSubject[]
}

export function IbSubjectDirectoryClient({
  grouped,
  hrefPrefix,
  metaBySlug = {},
  yoursHeading = 'Your subjects',
}: {
  grouped: Group[]
  /** e.g. `/ib/past-papers` or `/ib/subjects` */
  hrefPrefix: string
  metaBySlug?: Record<string, string>
  yoursHeading?: string
}) {
  const preferredCodes = usePreferredSubjectCodes()
  const all = useMemo(() => grouped.flatMap((g) => g.subjects), [grouped])
  const { yours, rest } = useMemo(
    () => splitPreferredSubjects(all, preferredCodes, (s) => s.slug),
    [all, preferredCodes]
  )
  const restGrouped = useMemo(() => {
    const restSlugs = new Set(rest.map((s) => s.slug))
    return grouped
      .map((g) => ({
        ...g,
        subjects: g.subjects.filter((s) => restSlugs.has(s.slug)),
      }))
      .filter((g) => g.subjects.length > 0)
  }, [grouped, rest])

  function renderCard(s: IbSubject) {
    const meta = metaBySlug[s.slug]
    return (
      <li key={s.slug}>
        <Link
          href={`${hrefPrefix}/${s.slug}`}
          className="ms-pp-card subject-accented"
          style={{ '--acc': s.accent } as CSSProperties}
        >
          <span className="ms-pp-glyph" aria-hidden>
            {s.level}
          </span>
          <span className="min-w-0 flex-1">
            <span className="ms-pp-title">{s.name}</span>
            {meta ? <span className="ms-pp-meta">{meta}</span> : null}
          </span>
          <span className="ms-pp-cta" aria-hidden>
            -&gt;
          </span>
        </Link>
      </li>
    )
  }

  return (
    <>
      {yours.length > 0 ? (
        <section style={{ marginTop: 36 }} aria-labelledby="ib-yours">
          <h2 id="ib-yours" className="ms-h3" style={{ marginBottom: 14 }}>
            {yoursHeading}
          </h2>
          <ul className="ms-pp-grid">{yours.map(renderCard)}</ul>
        </section>
      ) : null}

      {restGrouped.map((g) => (
        <section
          key={g.group}
          style={{ marginTop: 36 }}
          aria-labelledby={`g-${g.groupNumber}`}
        >
          <h2 id={`g-${g.groupNumber}`} className="ms-h3" style={{ marginBottom: 14 }}>
            Group {g.groupNumber} · {g.group}
          </h2>
          <ul className="ms-pp-grid">{g.subjects.map(renderCard)}</ul>
        </section>
      ))}
    </>
  )
}
