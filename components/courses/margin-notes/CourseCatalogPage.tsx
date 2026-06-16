'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { MarginNotesSubject, SubjectFamily } from '@/lib/courses/margin-notes/types'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { ContinueLearningStrip } from '@/components/courses/margin-notes/ContinueLearningStrip'
import { Ring } from '@/components/courses/margin-notes/Ring'
import { InkScribble, MarginNote } from '@/components/courses/margin-notes/HandAnnotations'

function SubjectCard({ s }: { s: MarginNotesSubject }) {
  const started = s.prog > 0
  return (
    <Link
      className="scard"
      style={{ '--acc': accentCssVar(s.acc) } as React.CSSProperties}
      href={`/courses/${s.code}`}
      data-screen-label={`Courses — ${s.name} card`}
    >
      <div className="scard-top">
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
          {s.level} · CAIE · {s.units} units
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

type Props = {
  subjects: MarginNotesSubject[]
  continueCatalog: ContinueCatalogEntry[]
}

const FAMS: Array<SubjectFamily | 'All'> = ['All', 'Sciences', 'Maths', 'Commerce', 'Humanities']

export function CourseCatalogPage({ subjects, continueCatalog }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [fam, setFam] = useState<SubjectFamily | 'All'>('All')

  useEffect(() => {
    const param = searchParams.get('fam')
    if (param && FAMS.includes(param as SubjectFamily | 'All')) {
      setFam(param as SubjectFamily | 'All')
    }
  }, [searchParams])

  const selectFam = useCallback(
    (next: SubjectFamily | 'All') => {
      setFam(next)
      const params = new URLSearchParams(searchParams.toString())
      if (next === 'All') params.delete('fam')
      else params.set('fam', next)
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const list = fam === 'All' ? subjects : subjects.filter((s) => s.fam === fam)
  const totalLessons = subjects.reduce((a, s) => a + s.lessons, 0)
  const totalQ = subjects.reduce((a, s) => a + s.q, 0)

  return (
    <main className="catalog-page" data-screen-label="Courses — catalog">
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
          <div className="fam-tabs">
            {FAMS.map((f) => (
              <button
                key={f}
                type="button"
                className={`fam-tab${fam === f ? ' on' : ''}`}
                onClick={() => selectFam(f)}
              >
                {f}
              </button>
            ))}
          </div>
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
