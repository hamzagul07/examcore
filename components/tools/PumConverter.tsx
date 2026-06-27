'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PUM_GRADES, rawToPum, type PumBoundary } from '@/lib/seo/uniform-marks'

function initialRows(): PumBoundary[] {
  return PUM_GRADES.map((grade) => ({ grade, mark: '' }))
}

export function PumConverter() {
  const [raw, setRaw] = useState('')
  const [total, setTotal] = useState('')
  const [rows, setRows] = useState<PumBoundary[]>(initialRows())

  function setMark(i: number, value: string) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, mark: value === '' ? '' : Number(value) } : r))
    )
  }

  const rawNum = raw === '' ? NaN : Number(raw)
  const totalNum = total === '' ? NaN : Number(total)
  const ready =
    Number.isFinite(rawNum) && Number.isFinite(totalNum) && totalNum > 0 && rows.some((r) => r.mark !== '')

  const result = useMemo(() => {
    if (!ready) return null
    return rawToPum(rawNum, totalNum, rows)
  }, [ready, rawNum, totalNum, rows])

  return (
    <div className="gb-tool">
      <div className="gb-grid">
        <div className="gb-inputs">
          <label className="gb-field">
            <span>Your raw mark</span>
            <input
              inputMode="numeric"
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="e.g. 56"
            />
          </label>
          <label className="gb-field">
            <span>Paper / component total</span>
            <input
              inputMode="numeric"
              value={total}
              onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="e.g. 75"
            />
          </label>

          <p className="gb-help micro">
            Enter the A–E <strong>raw-mark thresholds</strong> from your official Cambridge grade
            threshold table for that component. The PUM scale fixes A=80, B=70, C=60, D=50, E=40.
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
                  aria-label={`Raw boundary for grade ${r.grade}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="gb-result" aria-live="polite">
          {!result || result.pum === null ? (
            <div className="gb-result-empty">
              <p className="ms-body-2">
                Enter your mark, the total, and at least one boundary to see your PUM.
              </p>
            </div>
          ) : (
            <>
              <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
                Percentage Uniform Mark
              </p>
              <div className="gb-grade-big mono">{result.pum}</div>
              <p className="gb-percent mono">PUM {result.grade ? `· grade ${result.grade}` : ''}</p>
              {result.nextGrade && result.marksToNext !== null ? (
                <p className="gb-next">
                  <strong>{result.marksToNext}</strong> more raw mark
                  {result.marksToNext === 1 ? '' : 's'} for a <strong>{result.nextGrade}</strong>
                </p>
              ) : (
                <p className="gb-next">Top of the ladder for the boundaries entered.</p>
              )}
              <p className="gb-disclaimer micro">
                An estimate from the boundaries you entered. A* (PUM 90) is awarded on the overall
                subject aggregate, not per component. Confirm against your official statement of
                results.
              </p>
              <Link
                href="/mark"
                className="ec-btn-primary inline-flex min-h-[44px]"
                style={{ marginTop: 12 }}
              >
                See what each mark was worth <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
