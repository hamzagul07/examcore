'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { MathText } from '@/components/MathText'
import { CountUp } from '@/components/ui/CountUp'
import { SkeletonBlock, SkeletonLine } from '@/components/ui/PageSkeleton'
import {
  TeacherBackLink,
  TeacherPageContainer,
  TeacherPageHeader,
} from '@/components/teacher/TeacherPageChrome'
import type { CohortGapReport, MarkTypeGap } from '@/lib/teacher/cohort-gaps'

type Payload = {
  report: CohortGapReport
  headline: MarkTypeGap | null
  students: number
  /** Set when the class has more marked work than one report will read. */
  truncated: number | null
}

/** Weak marks read as a warning, strong ones as reassurance. Reserved status
 * tokens only — both themes define them, so no literal fallback. */
function barTone(pct: number): string {
  if (pct < 40) return 'var(--ec-score-low)'
  if (pct < 75) return 'var(--ec-score-mid)'
  return 'var(--ec-score-high)'
}

export default function CohortGapsPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/teacher/classroom/${id}/gaps`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setData(d as Payload)
      })
      .catch(() => setError('Could not load the report.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <TeacherPageContainer>
        <div aria-busy aria-label="Loading the gap report">
          {/* Back link row, then the header (eyebrow, title, lead) beside the
              print button, then the headline card and the mark-type card. */}
          <SkeletonLine className="mb-6 h-4 w-32" />
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SkeletonLine className="mb-3 h-3 w-36" />
              <SkeletonBlock className="h-10 w-80 max-w-full sm:h-11" />
              <SkeletonLine className="mt-3 h-4 w-72 max-w-full" />
            </div>
            <SkeletonBlock className="h-11 w-24" />
          </div>
          <SkeletonBlock className="mb-6 h-24 w-full" />
          <SkeletonBlock className="h-72 w-full" />
        </div>
      </TeacherPageContainer>
    )
  }

  if (error || !data) {
    return (
      <TeacherPageContainer>
        <TeacherBackLink href={`/teacher/classroom/${id}`}>
          ← Back to classroom
        </TeacherBackLink>
        {error ? (
          <div className="ms-teacher-error ec-land" role="alert">
            <p className="font-semibold text-[var(--ec-text-primary)]">Report unavailable</p>
            <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">{error}</p>
            <Link
              href={`/teacher/classroom/${id}`}
              className="ec-btn-secondary mt-4 inline-flex min-h-[44px] items-center"
            >
              Back to classroom
            </Link>
          </div>
        ) : (
          <div className="ms-teacher-empty ec-land">
            <span className="ms-teacher-empty__icon" aria-hidden>
              <span className="font-mono text-sm font-bold tracking-wide">¶</span>
            </span>
            <p className="ms-teacher-empty__title">No report available.</p>
            <Link
              href={`/teacher/classroom/${id}`}
              className="ec-btn-secondary mt-2 inline-flex min-h-[44px] items-center"
            >
              Back to classroom
            </Link>
          </div>
        )}
      </TeacherPageContainer>
    )
  }

  const { report, headline } = data

  return (
    <TeacherPageContainer>
      <div className="print:hidden">
        <TeacherBackLink href={`/teacher/classroom/${id}`}>
          ← Back to classroom
        </TeacherBackLink>
      </div>

      {report.bandedScriptsExcluded > 0 && (
        <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
          {report.bandedScriptsExcluded} essay-style script
          {report.bandedScriptsExcluded === 1 ? ' is' : 's are'} included in the class
          average but not in the mark-type breakdown below — those are marked
          against bands rather than individual marks.
        </p>
      )}

      {data.truncated && (
        <p className="mb-4 text-sm text-[var(--ec-text-secondary)]">
          Showing the {data.truncated.toLocaleString()} most recent marked scripts.
        </p>
      )}

      <div className="ec-land mb-6 flex flex-wrap items-start justify-between gap-4">
        <TeacherPageHeader
          label="COHORT GAP REPORT"
          title="Where the class loses marks"
          lead={
            <span className="tabular-nums">
              {`${report.scripts} marked scripts from ${report.students} students · class average ${report.averagePct}%`}
            </span>
          }
        />
        <button
          type="button"
          onClick={() => window.print()}
          className="ec-btn-secondary inline-flex min-h-[44px] items-center gap-2 print:hidden"
        >
          <span className="font-mono text-[11px] font-bold" aria-hidden>PR</span> Print
        </button>
      </div>

      {report.insufficientEvidence ? (
        <div className="ms-teacher-empty ec-land ec-land--1">
          <span className="ms-teacher-empty__icon" aria-hidden>
            <span className="font-mono text-sm font-bold tracking-wide">¶</span>
          </span>
          <p className="ms-teacher-empty__title">Not enough marked work yet.</p>
          <p className="ms-teacher-empty__body">
            This report needs at least three marked scripts before it will say
            anything about the class. Marking a set of mocks is the fastest way to
            fill it.
          </p>
          <Link
            href="/mark"
            className="ec-btn-primary mt-2 inline-flex min-h-[44px] items-center gap-2 print:hidden"
          >
            <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
              M1
            </span>
            Mark a script
          </Link>
        </div>
      ) : (
        <>
          {headline && (
            <div className="ec-card ec-card--paper ec-land ec-land--1 mb-6 p-6">
              <div className="ec-label-tech mb-2 flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold tracking-wide text-[var(--ec-brand)]" aria-hidden>¶</span> THE HEADLINE
              </div>
              <p className="text-title tabular-nums">
                The class earns only <CountUp value={headline.earnedPct} />% of {headline.label} marks
                <span className="font-normal text-[var(--ec-text-secondary)]">
                  {' '}({headline.earned} of {headline.points} available)
                </span>
              </p>
            </div>
          )}

          <div className="ec-card ec-card--paper ec-land ec-land--2 mb-6 p-6">
            <div className="ec-label-tech mb-4">BY MARK TYPE — WEAKEST FIRST</div>
            <ul>
              {report.markTypes.map((t) => (
                <li key={t.code} className="ms-gap-row">
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-[var(--ec-text-primary)]">
                      {t.label}
                      {t.thinEvidence && (
                        <span
                          className="ml-2 text-xs font-normal text-[var(--ec-text-secondary)]"
                          title="Too few of these marks have been attempted to draw a conclusion"
                        >
                          thin evidence
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-[var(--ec-text-secondary)]">
                      {t.earned}/{t.points} · {t.earnedPct}%
                    </span>
                  </div>
                  <div
                    className="ms-gap-track"
                    role="img"
                    aria-label={`${t.label}: ${t.earnedPct} percent of marks earned`}
                  >
                    <div
                      className="ms-gap-fill"
                      style={{
                        width: `${t.earnedPct}%`,
                        // Thin rows are drawn faintly so the eye is not drawn to
                        // a number the report has just said not to trust.
                        background: barTone(t.earnedPct),
                        opacity: t.thinEvidence ? 0.4 : 1,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {report.mostMissed.length > 0 && (
            <div className="ec-card ec-card--paper ec-land ec-land--3 mb-6 p-6">
              <div className="ec-label-tech mb-4">
                THE SPECIFIC THINGS MOST STUDENTS MISSED
              </div>
              <ul className="space-y-2">
                {report.mostMissed.map((m) => (
                  <li key={m.note} className="flex gap-3 text-sm">
                    <span className="min-w-[5.5rem] shrink-0 tabular-nums text-[var(--ec-text-secondary)]">
                      {m.students} student{m.students === 1 ? '' : 's'}
                    </span>
                    <span className="text-[var(--ec-text-primary)]">
                      <MathText text={m.note} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.errorBreakdown.length > 0 && (
            <div className="ec-card ec-card--paper ec-land ec-land--4 p-6">
              <div className="ec-label-tech mb-4">WHY MARKS WERE DROPPED</div>
              <ul className="flex flex-wrap gap-2">
                {report.errorBreakdown.map((e) => (
                  <li
                    key={e.classification}
                    className="rounded border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-3 py-1 font-mono text-xs font-semibold tabular-nums text-[var(--ec-text-secondary)]"
                  >
                    {e.label} · {e.count}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </TeacherPageContainer>
  )
}
