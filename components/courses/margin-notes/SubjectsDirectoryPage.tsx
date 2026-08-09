'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import { subjectProgressPercent } from '@/lib/courses/margin-notes/continue-learning'
import { useCourseProgressRevision } from '@/components/courses/CourseProgressClient'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { FamilyFilterStrip, useFamilyFilterFromUrl } from '@/components/courses/FamilyFilterStrip'

type Props = {
  subjects: MarginNotesSubject[]
  /** Quiet SEO slip after the syllabus spine (product-first). */
  seoIntro?: ReactNode
}

export function SubjectsDirectoryPage({ subjects, seoIntro }: Props) {
  const progressRev = useCourseProgressRevision()
  const [list, setList] = useState(subjects)
  const { fam, selectFam } = useFamilyFilterFromUrl()

  useEffect(() => {
    setList(
      subjects.map((s) => ({
        ...s,
        prog: subjectProgressPercent(s.code, s.lessons),
      }))
    )
  }, [subjects, progressRev])

  const filtered = fam === 'All' ? list : list.filter((s) => s.fam === fam)

  return (
    <main className="ms-pg ms-subjects-page" data-screen-label="Subjects directory" style={{ paddingTop: 8 }}>
      <header style={{ marginBottom: 8 }}>
        <p className="ms-overline">Subjects · Cambridge International</p>
        <h1 className="ms-h2" style={{ marginTop: 6, marginBottom: 8 }}>
          Every syllabus, <em>one desk.</em>
        </h1>
        <p className="ms-lead" style={{ maxWidth: '46ch' }}>
          Each subject hub bundles the free course, real past papers to mark, and honest
          grade-boundary estimates — all in one place.
        </p>
      </header>

      <div className="catalog-bar" style={{ marginTop: 28 }}>
        <FamilyFilterStrip
          value={fam}
          onChange={selectFam}
          className="fam-tabs"
          tabClassName="fam-tab"
        />
        <span className="micro catalog-count">{filtered.length} subjects</span>
      </div>

      {filtered.length ? (
        <ul className="ms-pp-grid">
          {filtered.map((s) => (
            <li key={s.code}>
              <Link
                href={`/subjects/${s.code}`}
                className="ms-pp-card subject-accented"
                style={{ '--acc': accentCssVar(s.acc) } as CSSProperties}
                data-screen-label={`Subject — ${s.name} card`}
              >
                <span className="ms-pp-glyph" aria-hidden>
                  {s.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="ms-pp-title">{s.name}</span>
                  <span className="ms-pp-meta">
                    {s.level} · {s.lessons} lessons
                    {s.prog > 0 ? ` · ${s.prog}% in course` : ''}
                  </span>
                </span>
                <span className="ms-pp-cta" aria-hidden>
                  -&gt;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ms-sd-card ms-sd-card-pad">
          <p className="ms-overline">No matches</p>
          <h3 className="ms-h3" style={{ marginTop: 8, fontSize: '1.1rem' }}>
            No subjects in this family yet
          </h3>
          <p className="ms-body-2" style={{ marginTop: 8 }}>
            Try another filter — or browse all subjects on the desk.
          </p>
          <button
            type="button"
            className="ec-btn-ghost sm"
            style={{ marginTop: 14 }}
            onClick={() => selectFam('All')}
          >
            Show all subjects -&gt;
          </button>
        </div>
      )}

      {seoIntro}

      <aside className="ms-subjects-honesty" style={{ marginTop: 28 }}>
        <span className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
          Honest about grades
        </span>
        <p className="ms-body-2" style={{ marginTop: 8, marginBottom: 0, maxWidth: '56ch' }}>
          Grade boundaries shift every session. We show honest A*–E estimates from recent series so
          you know what a mark is roughly worth — never a promise, always a guide.
        </p>
      </aside>
    </main>
  )
}
