'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { PaperSessionGroup } from '@/lib/subjects/paper-browser'

type SubjectPaperBrowserProps = {
  sessions: PaperSessionGroup[]
  years: number[]
}

export function SubjectPaperBrowser({
  sessions,
  years,
}: SubjectPaperBrowserProps) {
  const [year, setYear] = useState<number | 'all'>('all')

  const filtered = useMemo(() => {
    if (year === 'all') return sessions
    return sessions.filter((s) => s.year === year)
  }, [sessions, year])

  const yearOptions: Array<number | 'all'> = ['all', ...years]

  return (
    <div className="ms-sd-card" style={{ overflow: 'hidden' }}>
      <div className="ms-sd-card-head">
        <span className="ms-micro">
          PAST PAPERS — PICK A VARIANT TO MARK AGAINST ITS SCHEME
        </span>
        <div className="ms-yr-chips" role="tablist" aria-label="Filter by year">
          {yearOptions.map((y) => (
            <button
              key={String(y)}
              type="button"
              role="tab"
              aria-selected={year === y}
              className={`ms-yr-chip ${year === y ? 'on' : ''}`}
              onClick={() => setYear(y)}
            >
              {y === 'all' ? 'ALL' : String(y)}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="ms-sd-card-pad text-sm text-[var(--ec-text-secondary)]">
          No papers in our library for this year yet.
        </div>
      ) : (
        filtered.map((sess) => (
          <div key={sess.sessionCode} className="ms-sess">
            <div className="ms-sess-name">
              <b>{sess.name}</b>
              <span className="ms-micro">{sess.variants.length} VARIANTS</span>
            </div>
            <div className="ms-variant-row">
              {sess.variants.map((variant) => (
                <Link
                  key={`${sess.sessionCode}-${variant}`}
                  href="/mark"
                  className="ms-variant"
                  title={`Mark against Paper ${variant} · ${sess.name}`}
                >
                  Paper {variant}
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
