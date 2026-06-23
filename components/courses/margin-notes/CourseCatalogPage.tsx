'use client'

import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'
import { ContinueLearningStrip } from '@/components/courses/margin-notes/ContinueLearningStrip'
import { SubjectCard } from '@/components/courses/margin-notes/SubjectCard'
import { InkScribble, MarginNote } from '@/components/courses/margin-notes/HandAnnotations'
import { FamilyFilterStrip, useFamilyFilterFromUrl } from '@/components/courses/FamilyFilterStrip'

type Props = {
  subjects: MarginNotesSubject[]
  continueCatalog: ContinueCatalogEntry[]
}

export function CourseCatalogPage({ subjects, continueCatalog }: Props) {
  const { fam, selectFam } = useFamilyFilterFromUrl()

  const list = fam === 'All' ? subjects : subjects.filter((s) => s.fam === fam)
  const totalLessons = subjects.reduce((a, s) => a + s.lessons, 0)
  const totalQ = subjects.reduce((a, s) => a + s.q, 0)

  return (
    <main className="catalog-page ec-page-mesh" data-screen-label="Courses — catalog">
      <header className="catalog-hero pg">
        <div className="catalog-hero-text">
          <p className="overline">Courses · 100% free, forever</p>
          <h1 className="h-display">
            Premium courses,
            <br />
            <em>without the premium.</em>
          </h1>
          <p className="lead catalog-lead">
            Syllabus-aligned, topic by topic — with a real Cambridge past-paper question for every
            syllabus point. Learn it, practise it, <InkScribble>mark it</InkScribble>.
          </p>
        </div>
        <div className="catalog-hero-meta">
          <div className="hero-stat">
            <b>{subjects.length}</b>
            <span>subjects</span>
          </div>
          <div className="hero-stat">
            <b>{totalLessons.toLocaleString()}</b>
            <span>lessons</span>
          </div>
          <div className="hero-stat">
            <b>{totalQ.toLocaleString()}</b>
            <span>past-paper Qs</span>
          </div>
          <MarginNote className="catalog-hero-note">all free — no card ↓</MarginNote>
        </div>
      </header>

      <div className="pg">
        <ContinueLearningStrip catalog={continueCatalog} screenLabel="Courses — continue learning" />

        <div className="catalog-bar">
          <FamilyFilterStrip
            value={fam}
            onChange={selectFam}
            className="fam-tabs"
            tabClassName="fam-tab"
          />
          <span className="micro catalog-count">{list.length} courses · A-Level</span>
        </div>

        <div className="catalog-grid">
          {list.length ? (
            list.map((s) => <SubjectCard key={s.code} s={s} />)
          ) : (
            <div className="catalog-empty card card-pad">
              <p className="overline mono">No matches</p>
              <h3 className="h3 empty-title">No courses in this family yet</h3>
              <p className="body-2 empty-copy">
                Try another filter — or browse all subjects to see what&apos;s live today.
              </p>
              <button type="button" className="btn-ghost sm catalog-empty-reset" onClick={() => selectFam('All')}>
                Show all courses →
              </button>
            </div>
          )}
        </div>

        <div className="catalog-footnote">
          <span className="micro">
            FLASHCARDS · WORKED EXAMPLES · EXAM TIPS · “EXPLAIN SIMPLER” ON EVERY LESSON
          </span>
        </div>
      </div>
    </main>
  )
}
