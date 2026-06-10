'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { SubjectCard } from '@/components/margin-notes'
import type { CatalogLevel, CatalogSubject } from '@/lib/subjects-catalog'

type SubjectsCatalogClientProps = {
  alevelSubjects: CatalogSubject[]
  olevelSubjects: CatalogSubject[]
  stats: {
    syllabi: number
    papers: number
    markedLabel: string
    coursesWithContent: number
  }
}

export function SubjectsCatalogClient({
  alevelSubjects,
  olevelSubjects,
  stats,
}: SubjectsCatalogClientProps) {
  const [level, setLevel] = useState<CatalogLevel>('alevel')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const base = level === 'olevel' ? olevelSubjects : alevelSubjects
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    )
  }, [alevelSubjects, level, olevelSubjects, query])

  const levelStats = level === 'olevel' ? olevelSubjects : alevelSubjects

  return (
    <>
      <div className="ms-subjects-toolbar">
        <div className="ms-lvl-tabs" role="tablist" aria-label="Qualification level">
          <button
            type="button"
            role="tab"
            aria-selected={level === 'alevel'}
            className={`ms-lvl-tab ${level === 'alevel' ? 'on' : ''}`}
            onClick={() => setLevel('alevel')}
          >
            AS &amp; A Level
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={level === 'olevel'}
            className={`ms-lvl-tab ${level === 'olevel' ? 'on' : ''}`}
            onClick={() => setLevel('olevel')}
          >
            O Level
          </button>
          <button type="button" className="ms-lvl-tab" disabled>
            IB <span className="soon">coming soon!</span>
          </button>
        </div>
        <label className="ms-subj-search">
          <span className="si" aria-hidden>
            ⌕
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or code — try 9702"
            aria-label="Search subjects"
          />
        </label>
      </div>

      <div className="ms-scard-grid" key={level}>
        {list.map((subject) => (
          <SubjectCard key={subject.code} subject={subject} />
        ))}
        {list.length === 0 ? (
          <div
            className="ms-sd-card ms-sd-card-pad"
            style={{ gridColumn: '1 / -1', textAlign: 'center' }}
          >
            <p className="ms-greennote" style={{ fontSize: 21 }}>
              nothing matches &ldquo;{query}&rdquo; —{' '}
              <Link href="/contact" className="underline">
                tell us and we&apos;ll add it →
              </Link>
            </p>
          </div>
        ) : null}
      </div>

      <div className="ms-zstats">
        <div>
          <b>{levelStats.length}</b>
          <span>Syllabuses</span>
        </div>
        <div>
          <b>{levelStats.reduce((n, s) => n + s.papers, 0).toLocaleString('en-GB')}</b>
          <span>Past papers</span>
        </div>
        <div>
          <b>{stats.markedLabel}</b>
          <span>Questions marked</span>
        </div>
        <div>
          <b>100%</b>
          <span>Free courses</span>
        </div>
      </div>

      <p className="ms-micro" style={{ marginTop: 26 }}>
        MISSING YOUR SYLLABUS?{' '}
        <Link href="/contact" className="underline">
          TELL US
        </Link>{' '}
        — NEW SUBJECTS SHIP MONTHLY · IB &amp; OTHER BOARDS LATER
      </p>
    </>
  )
}
