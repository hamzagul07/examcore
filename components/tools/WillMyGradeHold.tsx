'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  A_LEVEL_GRADES,
  AS_LEVEL_GRADES,
  computeGrade,
  type GradeThreshold,
  type OfficialBoundaries,
} from '@/lib/seo/grade-boundaries'
import { MockPackEmailCapture } from '@/components/tools/MockPackEmailCapture'

function rowsFromOfficial(
  official: OfficialBoundaries | null,
  level: 'A-Level' | 'AS-Level'
): GradeThreshold[] {
  const grades = level === 'AS-Level' ? AS_LEVEL_GRADES : A_LEVEL_GRADES
  const component = official?.sessions[0]?.components[0]
  if (!component) return grades.map((grade) => ({ grade, mark: '' as const }))
  return grades.map((grade) => {
    const key = grade.replace('*', '') as keyof typeof component.thresholds
    // A* is stored as A in some tables; keep A* row empty if missing
    if (grade === 'A*') {
      const thresholds = component.thresholds as Record<string, number | undefined>
      const aStar = thresholds['A*']
      return { grade, mark: typeof aStar === 'number' ? aStar : ('' as const) }
    }
    const mark = component.thresholds[key as 'A' | 'B' | 'C' | 'D' | 'E']
    return { grade, mark: typeof mark === 'number' ? mark : ('' as const) }
  })
}

export function WillMyGradeHold({
  code,
  subjectLabel,
  official = null,
  defaultLevel = 'A-Level',
}: {
  code?: string | null
  subjectLabel?: string | null
  official?: OfficialBoundaries | null
  defaultLevel?: 'A-Level' | 'AS-Level'
}) {
  const [level, setLevel] = useState<'A-Level' | 'AS-Level'>(defaultLevel)
  const [raw, setRaw] = useState('')
  const [total, setTotal] = useState(
    official?.sessions[0]?.components[0]?.max
      ? String(official.sessions[0].components[0].max)
      : ''
  )
  const [rows, setRows] = useState<GradeThreshold[]>(() =>
    rowsFromOfficial(official, defaultLevel)
  )

  const result = useMemo(() => {
    const rawN = Number(raw)
    const totalN = Number(total)
    if (!Number.isFinite(rawN) || !Number.isFinite(totalN) || totalN <= 0) return null
    return computeGrade(rawN, totalN, rows)
  }, [raw, total, rows])

  function switchLevel(next: 'A-Level' | 'AS-Level') {
    setLevel(next)
    setRows(rowsFromOfficial(official, next))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="ec-card space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {(['A-Level', 'AS-Level'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => switchLevel(opt)}
              className={
                level === opt ? 'ec-btn-primary min-h-[40px]' : 'ec-btn-ghost min-h-[40px]'
              }
            >
              {opt}
            </button>
          ))}
        </div>

        {code ? (
          <p className="ms-body-2">
            Checking <strong>{code}</strong>
            {subjectLabel ? ` · ${subjectLabel}` : ''}. Pre-filled from the latest verified
            session where available — always confirm against your official statement.
          </p>
        ) : (
          <p className="ms-body-2">
            Paste your raw mark and the published thresholds for your component. We show the
            grade and the gap to the next boundary.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="ms-overline">Raw mark</span>
            <input
              inputMode="decimal"
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ''))}
              className="mt-1 w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-bg)] px-3 py-2.5"
              placeholder="e.g. 62"
            />
          </label>
          <label className="block text-sm">
            <span className="ms-overline">Paper / aggregate total</span>
            <input
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))}
              className="mt-1 w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-bg)] px-3 py-2.5"
              placeholder="e.g. 100"
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="ms-overline">Thresholds (edit if needed)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rows.map((row, i) => (
              <label key={row.grade} className="block text-sm">
                <span className="text-[var(--ec-text-secondary)]">{row.grade}</span>
                <input
                  inputMode="decimal"
                  value={row.mark === '' ? '' : String(row.mark)}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, '')
                    setRows((prev) =>
                      prev.map((r, idx) =>
                        idx === i
                          ? { ...r, mark: v === '' ? '' : Number(v) }
                          : r
                      )
                    )
                  }}
                  className="mt-1 w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-bg)] px-3 py-2"
                />
              </label>
            ))}
          </div>
        </div>

        {result ? (
          <div className="rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface)] p-4">
            <p className="ms-overline">Predicted grade</p>
            <p className="ms-h2" style={{ fontSize: '2rem', marginTop: 4 }}>
              {result.grade ?? '—'}
              {result.percent != null ? (
                <span className="ms-body-2 ml-2 font-normal">
                  ({result.percent}%)
                </span>
              ) : null}
            </p>
            {result.nextGrade && result.marksToNext != null ? (
              <p className="ms-body-2 mt-2">
                <strong>{result.marksToNext}</strong> raw mark
                {result.marksToNext === 1 ? '' : 's'} to a {result.nextGrade}.
              </p>
            ) : (
              <p className="ms-body-2 mt-2">You&apos;re at the top of this ladder for the thresholds entered.</p>
            )}
            {code ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/mark?subject=${encodeURIComponent(code)}`}
                  className="ec-btn-primary min-h-[44px]"
                >
                  Mark a {code} question — free
                </Link>
                <Link
                  href={`/courses/${code}`}
                  className="ec-btn-ghost min-h-[44px]"
                >
                  Free {code} course
                </Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <MockPackEmailCapture
        source="will-my-grade-hold"
        syllabusCode={code}
        rawMark={raw === '' ? null : Number(raw)}
        predictedGrade={result?.grade ?? null}
      />
    </div>
  )
}
