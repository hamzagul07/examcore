'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { A_LEVEL_GRADES, AS_LEVEL_GRADES, computeGrade, type GradeThreshold } from '@/lib/seo/grade-boundaries'

function initialRows(grades: readonly string[]): GradeThreshold[] {
  return grades.map((grade) => ({ grade, mark: '' }))
}

export function GradeBoundaryCalculator({
  defaultLevel = 'A-Level',
  defaultTotal = '',
}: {
  defaultLevel?: 'A-Level' | 'AS-Level'
  defaultTotal?: string
}) {
  const [level, setLevel] = useState<'A-Level' | 'AS-Level'>(defaultLevel)
  const [raw, setRaw] = useState('')
  const [total, setTotal] = useState(defaultTotal)
  const [rows, setRows] = useState<GradeThreshold[]>(
    initialRows(defaultLevel === 'AS-Level' ? AS_LEVEL_GRADES : A_LEVEL_GRADES)
  )

  function switchLevel(next: 'A-Level' | 'AS-Level') {
    setLevel(next)
    setRows(initialRows(next === 'AS-Level' ? AS_LEVEL_GRADES : A_LEVEL_GRADES))
  }

  function setMark(i: number, value: string) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, mark: value === '' ? '' : Number(value) } : r))
    )
  }

  const rawNum = raw === '' ? NaN : Number(raw)
  const totalNum = total === '' ? NaN : Number(total)
  const ready = Number.isFinite(rawNum) && Number.isFinite(totalNum) && totalNum > 0 && rows.some((r) => r.mark !== '')

  const result = useMemo(() => {
    if (!ready) return null
    return computeGrade(rawNum, totalNum, rows)
  }, [ready, rawNum, totalNum, rows])

  return (
    <div className="gb-tool">
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

          <label className="gb-field">
            <span>Your raw mark</span>
            <input inputMode="numeric" value={raw} onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 58" />
          </label>
          <label className="gb-field">
            <span>Paper / aggregate total</span>
            <input inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 75" />
          </label>

          <p className="gb-help micro">
            Enter the boundary marks from your official Cambridge <strong>grade threshold table</strong>{' '}
            for the exact session. Leave a grade blank if you don’t have it.
          </p>

          <div className="gb-thresholds">
            {rows.map((r, i) => (
              <label key={r.grade} className="gb-threshold">
                <span className="gb-grade-label mono">{r.grade}</span>
                <input
                  inputMode="numeric"
                  value={r.mark === '' ? '' : String(r.mark)}
                  onChange={(e) => setMark(i, e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="mark"
                  aria-label={`Boundary mark for grade ${r.grade}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="gb-result" aria-live="polite">
          {!result ? (
            <div className="gb-result-empty">
              <p className="ms-body-2">Enter your mark, the total, and at least one boundary to see your grade.</p>
            </div>
          ) : (
            <>
              <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>Estimated grade</p>
              <div className="gb-grade-big mono">{result.grade ?? '—'}</div>
              {result.percent !== null && <p className="gb-percent mono">{result.percent}% of total</p>}
              {result.nextGrade && result.marksToNext !== null ? (
                <p className="gb-next">
                  <strong>{result.marksToNext}</strong> more mark{result.marksToNext === 1 ? '' : 's'} for a{' '}
                  <strong>{result.nextGrade}</strong>
                </p>
              ) : (
                <p className="gb-next">Top of the ladder for the boundaries entered.</p>
              )}
              <p className="gb-disclaimer micro">
                An estimate from the boundaries you entered. Boundaries change every session — confirm against the
                official table on results day.
              </p>
              <Link href="/mark" className="ec-btn-primary inline-flex min-h-[44px]" style={{ marginTop: 12 }}>
                See what each mark was worth <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
