'use client'

import { useEffect, useState } from 'react'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import { subjectProgressPercent } from '@/lib/courses/margin-notes/continue-learning'
import { useCourseProgressRevision } from '@/components/courses/CourseProgressClient'
import { SubjectCard } from '@/components/courses/margin-notes/SubjectCard'
import { FamilyFilterStrip, useFamilyFilterFromUrl } from '@/components/courses/FamilyFilterStrip'

type Props = {
  subjects: MarginNotesSubject[]
}

export function SubjectsDirectoryPage({ subjects }: Props) {
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
    <main className="subjects-page" data-screen-label="Subjects directory">
      <div className="pg">
        <header className="subjects-hero">
          <p className="overline">Subjects · Cambridge International</p>
          <h2 className="h-display subjects-title">
            Every subject, <em>one shelf.</em>
          </h2>
          <p className="lead subjects-lead">
            Each subject hub bundles the free course, real past papers to mark, and honest grade-boundary
            estimates — all in one place.
          </p>
        </header>

        <div className="catalog-bar">
          <FamilyFilterStrip
            value={fam}
            onChange={selectFam}
            className="fam-tabs"
            tabClassName="fam-tab"
          />
          <span className="micro catalog-count">{filtered.length} subjects</span>
        </div>

        <div className="catalog-grid">
          {filtered.length ? (
            filtered.map((s) => <SubjectCard key={s.code} s={s} />)
          ) : (
            <div className="catalog-empty card card-pad">
              <p className="overline mono">No matches</p>
              <h3 className="h3 empty-title">No subjects in this family yet</h3>
              <p className="body-2 empty-copy">
                Try another filter — or browse all subjects on the shelf.
              </p>
              <button type="button" className="btn-ghost sm catalog-empty-reset" onClick={() => selectFam('All')}>
                Show all subjects →
              </button>
            </div>
          )}
        </div>

        <div className="subjects-note card card-pad">
          <span className="micro tip-kicker">
            HONEST ABOUT GRADES
          </span>
          <p className="body-2 tip-copy">
            Grade boundaries shift every session. We show honest A*–E estimates from recent series so you know
            what a mark is roughly worth — never a promise, always a guide.
          </p>
        </div>
      </div>
    </main>
  )
}
