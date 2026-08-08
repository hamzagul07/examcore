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
import { buildGradeHoldSlipText } from '@/lib/tools/grade-hold-slip'
import { ToolShareActions } from '@/components/tools/ToolShareActions'

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

  function setMark(i: number, value: string) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, mark: value === '' ? '' : Number(value) } : r))
    )
  }

  return (
    <div className="gb-tool" style={{ marginTop: 0 }}>
      <div className="gb-grid">
        <div className="gb-inputs">
          <div className="gb-level">
            <button
              type="button"
              className={`cmd-tab${level === 'A-Level' ? ' is-active' : ''}`}
              onClick={() => switchLevel('A-Level')}
              aria-pressed={level === 'A-Level'}
            >
              A-Level (A*–E)
            </button>
            <button
              type="button"
              className={`cmd-tab${level === 'AS-Level' ? ' is-active' : ''}`}
              onClick={() => switchLevel('AS-Level')}
              aria-pressed={level === 'AS-Level'}
            >
              AS-Level (a–e)
            </button>
          </div>

          {code ? (
            <p className="gb-help micro">
              Checking <strong>{code}</strong>
              {subjectLabel ? ` · ${subjectLabel}` : ''}. Pre-filled from the latest verified
              session where available — always confirm against your official statement.
            </p>
          ) : (
            <p className="gb-help micro">
              Paste your raw mark and the published thresholds for your component. We show the
              grade and the gap to the next boundary.
            </p>
          )}

          <label className="gb-field">
            <span>Raw mark</span>
            <input
              inputMode="decimal"
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="e.g. 62"
            />
          </label>
          <label className="gb-field">
            <span>Paper / aggregate total</span>
            <input
              inputMode="decimal"
              value={total}
              onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="e.g. 100"
            />
          </label>

          <p className="gb-help micro">Thresholds (edit if needed)</p>
          <div className="gb-thresholds">
            {rows.map((row, i) => (
              <label key={row.grade} className="gb-threshold">
                <span className="gb-grade-label mono">{row.grade}</span>
                <input
                  inputMode="decimal"
                  value={row.mark === '' ? '' : String(row.mark)}
                  onChange={(e) => setMark(i, e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="mark"
                  aria-label={`Boundary mark for grade ${row.grade}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="gb-result" aria-live="polite">
          {!result ? (
            <div className="gb-result-empty">
              <p className="ms-body-2">
                Enter your raw mark, the total, and thresholds to see whether the grade holds.
              </p>
            </div>
          ) : (
            <>
              <span className="gb-result-stamp" aria-hidden>
                {result.grade ?? '—'}
              </span>
              <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
                Predicted grade
              </p>
              <div className="gb-grade-big">{result.grade ?? '—'}</div>
              {result.percent != null ? (
                <p className="gb-percent mono">{result.percent}% of total</p>
              ) : null}
              {result.nextGrade && result.marksToNext != null ? (
                <p className="gb-next">
                  <strong>{result.marksToNext}</strong> raw mark
                  {result.marksToNext === 1 ? '' : 's'} to a <strong>{result.nextGrade}</strong>
                </p>
              ) : (
                <p className="gb-next">Top of the ladder for the thresholds entered.</p>
              )}
              <p className="gb-disclaimer micro">
                An estimate from the thresholds entered. Official grades come from Cambridge via
                your centre — confirm against your statement of results.
              </p>
              <ToolShareActions
                title="MarkScheme · Will my grade hold?"
                url={
                  code
                    ? `https://markscheme.app/tools/will-my-grade-hold?code=${encodeURIComponent(code)}`
                    : 'https://markscheme.app/tools/will-my-grade-hold'
                }
                copyLabel="Copy result"
                text={buildGradeHoldSlipText({
                  grade: result.grade ?? null,
                  percent: result.percent ?? null,
                  raw: Number.isFinite(Number(raw)) ? Number(raw) : null,
                  total: Number.isFinite(Number(total)) ? Number(total) : null,
                  nextGrade: result.nextGrade ?? null,
                  marksToNext: result.marksToNext ?? null,
                  subjectLabel: subjectLabel ?? null,
                  code: code ?? null,
                  level,
                })}
              />
              {code ? (
                <div
                  className="mt-3 flex flex-wrap justify-center gap-2"
                  style={{ marginTop: 12 }}
                >
                  <Link
                    href={`/mark?subject=${encodeURIComponent(code)}`}
                    className="ec-btn-primary min-h-[44px]"
                  >
                    Mark a {code} question — free
                  </Link>
                  <Link href={`/courses/${code}`} className="ec-btn-ghost min-h-[44px]">
                    Free {code} course
                  </Link>
                </div>
              ) : (
                <Link
                  href="/mark"
                  className="ec-btn-primary inline-flex min-h-[44px]"
                  style={{ marginTop: 12 }}
                >
                  Mark a paper free <span aria-hidden>-&gt;</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <MockPackEmailCapture
          source="will-my-grade-hold"
          syllabusCode={code}
          rawMark={raw === '' ? null : Number(raw)}
          predictedGrade={result?.grade ?? null}
        />
      </div>
    </div>
  )
}
