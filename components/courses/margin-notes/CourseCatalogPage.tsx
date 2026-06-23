'use client'

import Link from 'next/link'
import type { MarginNotesSubject } from '@/lib/courses/margin-notes/types'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'
import { ContinueLearningStrip } from '@/components/courses/margin-notes/ContinueLearningStrip'
import { SubjectCard } from '@/components/courses/margin-notes/SubjectCard'
import { InkScribble, MarginNote } from '@/components/courses/margin-notes/HandAnnotations'
import { FamilyFilterStrip, useFamilyFilterFromUrl } from '@/components/courses/FamilyFilterStrip'

import type { IbCatalogCard } from '@/lib/courses/ib-catalog-display'
import { IB_COURSES_CATALOG_BLURB, ibCatalogTrackSections } from '@/lib/courses/ib-catalog-display'

type Props = {
  subjects: MarginNotesSubject[]
  continueCatalog: ContinueCatalogEntry[]
  ibSubjects?: IbCatalogCard[]
}

export function CourseCatalogPage({ subjects, continueCatalog, ibSubjects = [] }: Props) {
  const { fam, selectFam } = useFamilyFilterFromUrl()

  const list = fam === 'All' ? subjects : subjects.filter((s) => s.fam === fam)
  const totalLessons = subjects.reduce((a, s) => a + s.lessons, 0) + ibSubjects.reduce((a, s) => a + s.lessons, 0)
  const totalQ = subjects.reduce((a, s) => a + s.q, 0)
  const ibTrackSections = ibCatalogTrackSections(ibSubjects)

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
            Syllabus-aligned, topic by topic — Cambridge past-paper questions and IB criterion
            practice on every lesson. Learn it, practise it, <InkScribble>mark it</InkScribble>.
          </p>
        </div>
        <div className="catalog-hero-meta">
          <div className="hero-stat">
            <b>{subjects.length + ibSubjects.length}</b>
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
          <span className="micro catalog-count">
            {list.length} Cambridge · {ibSubjects.length} IB
          </span>
        </div>

        <div className="catalog-grid">
          {list.length ? (
            list.map((s) => <SubjectCard key={s.code} s={s} />)
          ) : fam !== 'All' ? (
            <div className="catalog-empty card card-pad">
              <p className="overline mono">No matches</p>
              <h3 className="h3 empty-title">No Cambridge courses in this family</h3>
              <p className="body-2 empty-copy">
                Try another filter — IB courses are listed below.
              </p>
              <button type="button" className="btn-ghost sm catalog-empty-reset" onClick={() => selectFam('All')}>
                Show all courses →
              </button>
            </div>
          ) : null}
        </div>

        {ibSubjects.length ? (
          <section className="catalog-ib-section" aria-labelledby="catalog-ib-heading">
            <h2 id="catalog-ib-heading" className="h3 catalog-ib-title">
              IB Diploma courses
            </h2>
            <p className="body-2 catalog-ib-lead">
              {IB_COURSES_CATALOG_BLURB}{' '}
              <Link href="/ib/courses" className="ec-link">
                Browse all IB courses →
              </Link>
            </p>
            {ibTrackSections.map((track) => (
                <div key={track.key} className="catalog-ib-track">
                  <p className="overline catalog-ib-track-label">{track.label}</p>
                  <div className="catalog-grid">
                    {track.items.map((s) => (
                      <SubjectCard
                        key={s.code}
                        s={s}
                        href={s.href}
                        boardLabel={s.boardLabel}
                        accentHex={s.accentHex}
                        statSuffix="criterion practice tasks"
                      />
                    ))}
                  </div>
                </div>
              ))}
          </section>
        ) : null}

        <div className="catalog-footnote">
          <span className="micro">
            FLASHCARDS · WORKED EXAMPLES · EXAM TIPS · “EXPLAIN SIMPLER” ON EVERY LESSON
          </span>
        </div>
      </div>
    </main>
  )
}
