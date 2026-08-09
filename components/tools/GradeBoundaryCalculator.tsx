'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import {
  A_LEVEL_GRADES,
  AS_LEVEL_GRADES,
  computeGrade,
  type GradeThreshold,
  type OfficialBoundaries,
} from '@/lib/seo/grade-boundaries'
import { readUrlParams, writeUrlParams } from '@/lib/url-state'
import { ToolShareActions } from '@/components/tools/ToolShareActions'
import { buildToolSlipText } from '@/lib/tools/tool-slip'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

function initialRows(grades: readonly string[]): GradeThreshold[] {
  return grades.map((grade) => ({ grade, mark: '' }))
}

export function GradeBoundaryCalculator({
  defaultLevel = 'A-Level',
  defaultTotal = '',
  official = null,
}: {
  defaultLevel?: 'A-Level' | 'AS-Level'
  defaultTotal?: string
  official?: OfficialBoundaries | null
}) {
  const [level, setLevel] = useState<'A-Level' | 'AS-Level'>(defaultLevel)
  const [raw, setRaw] = useState('')
  const [total, setTotal] = useState(defaultTotal)
  const [rows, setRows] = useState<GradeThreshold[]>(
    initialRows(defaultLevel === 'AS-Level' ? AS_LEVEL_GRADES : A_LEVEL_GRADES)
  )
  const [urlRestored, setUrlRestored] = useState(false)

  // Restore a shared / refreshed calculation from the URL, then keep the URL
  // in sync so the state survives refresh and can be shared.
  useEffect(() => {
    const q = readUrlParams()
    const lvlParam = q.get('lvl')
    const nextLevel: 'A-Level' | 'AS-Level' | null =
      lvlParam === 'as' ? 'AS-Level' : lvlParam === 'a' ? 'A-Level' : null
    if (nextLevel) setLevel(nextLevel)
    const rawParam = q.get('raw')
    if (rawParam) setRaw(rawParam.replace(/[^\d.]/g, ''))
    const totalParam = q.get('total')
    if (totalParam) setTotal(totalParam.replace(/[^\d.]/g, ''))
    const grades =
      (nextLevel ?? defaultLevel) === 'AS-Level' ? AS_LEVEL_GRADES : A_LEVEL_GRADES
    const bParam = q.get('b')
    if (nextLevel || bParam) {
      const parts = (bParam ?? '').split(',')
      setRows(
        grades.map((grade, i) => {
          const n = Number(parts[i])
          return { grade, mark: parts[i] !== '' && Number.isFinite(n) ? n : '' }
        })
      )
    }
    setUrlRestored(true)
    // Mount-only: defaultLevel is stable for the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!urlRestored) return
    const hasInput = raw !== '' || rows.some((r) => r.mark !== '')
    writeUrlParams({
      lvl: hasInput ? (level === 'AS-Level' ? 'as' : 'a') : null,
      raw: hasInput ? raw : null,
      total: hasInput ? total : null,
      b: hasInput ? rows.map((r) => (r.mark === '' ? '' : String(r.mark))).join(',') : null,
    })
  }, [urlRestored, level, raw, total, rows])

  function switchLevel(next: 'A-Level' | 'AS-Level') {
    setLevel(next)
    setRows(initialRows(next === 'AS-Level' ? AS_LEVEL_GRADES : A_LEVEL_GRADES))
  }

  // Official-data picker (only when verified data is supplied)
  const sessions = official?.sessions ?? []
  const [sessionIdx, setSessionIdx] = useState(0)
  const [componentCode, setComponentCode] = useState('')
  const activeSession = sessions[sessionIdx]

  function applyOfficial(code: string) {
    setComponentCode(code)
    const comp = activeSession?.components.find((c) => c.component === code)
    if (!comp) return
    setLevel('A-Level')
    setTotal(String(comp.max))
    setRows(
      A_LEVEL_GRADES.map((g) => ({ grade: g, mark: g === 'A*' ? '' : comp.thresholds[g as 'A' | 'B' | 'C' | 'D' | 'E'] }))
    )
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
      {official && activeSession && (
        <div className="gb-official">
          <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 8 }}>
            Load official {official.code} boundaries
          </p>
          <div className="gb-official-controls">
            {sessions.length > 1 && (
              <label className="gb-field">
                <span>Session</span>
                <select
                  value={sessionIdx}
                  onChange={(e) => { setSessionIdx(Number(e.target.value)); setComponentCode('') }}
                >
                  {sessions.map((s, i) => (
                    <option key={s.session} value={i}>{s.session}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="gb-field">
              <span>Paper / component</span>
              <select value={componentCode} onChange={(e) => applyOfficial(e.target.value)}>
                <option value="">Choose a paper…</option>
                {activeSession.components.map((c) => (
                  <option key={c.component} value={c.component}>
                    {official.code}/{c.component} — {c.paper}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="gb-help micro" style={{ margin: '6px 0 0' }}>
            Verified from the{' '}
            <a href={activeSession.sourceUrl} target="_blank" rel="noopener noreferrer" className="ec-btn-underline">
              official Cambridge {activeSession.session} grade thresholds
            </a>
            . {official.note}
          </p>
        </div>
      )}
      <div className="gb-grid">
        <div className="gb-inputs">
          <SegmentedControl
            className="gb-level"
            optionClassName="cmd-tab"
            aria-label="Qualification level"
            value={level}
            onChange={switchLevel}
            options={[
              { value: 'A-Level', label: 'A-Level (A*–E)' },
              { value: 'AS-Level', label: 'AS-Level (a–e)' },
            ]}
          />

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
              <span className="gb-result-stamp" aria-hidden>
                {result.grade ?? '—'}
              </span>
              <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
                Estimated grade
              </p>
              <div className="gb-grade-big">{result.grade ?? '—'}</div>
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
              <ToolShareActions
                title="MarkScheme · Grade boundary"
                url="https://markscheme.app/tools/grade-boundary-calculator"
                text={buildToolSlipText([
                  'MarkScheme · Grade boundary calculator',
                  `Level: ${level}`,
                  `${rawNum} / ${totalNum}${result.percent != null ? ` · ${result.percent}%` : ''}`,
                  result.grade ? `Estimated grade: ${result.grade}` : null,
                  result.nextGrade && result.marksToNext != null
                    ? `${result.marksToNext} mark${result.marksToNext === 1 ? '' : 's'} to ${result.nextGrade}`
                    : null,
                  'markscheme.app/tools/grade-boundary-calculator',
                ])}
              />
              <Link href="/mark" className="ec-btn-primary inline-flex min-h-[44px]" style={{ marginTop: 12 }}>
                See what each mark was worth <span className="h-4 w-4" aria-hidden>-&gt;</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
