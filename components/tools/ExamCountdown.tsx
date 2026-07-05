'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { buildCountdown } from '@/lib/seo/revision-countdown'
import { readUrlParams, writeUrlParams } from '@/lib/url-state'

export function ExamCountdown() {
  const [examDate, setExamDate] = useState('')
  const [subjects, setSubjects] = useState('3')
  const [papersEach, setPapersEach] = useState('8')
  const [urlRestored, setUrlRestored] = useState(false)
  // Resolve "now" on the client only, so SSR/CSR markup matches.
  const [nowMs, setNowMs] = useState<number | null>(null)
  useEffect(() => {
    setNowMs(Date.now())
  }, [])

  // Restore a shared / refreshed countdown from the URL, then keep the URL in
  // sync so the plan survives refresh and can be shared.
  useEffect(() => {
    const q = readUrlParams()
    const date = q.get('date')
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) setExamDate(date)
    const s = q.get('subjects')
    if (s && /^\d+$/.test(s)) setSubjects(s)
    const p = q.get('papers')
    if (p && /^\d+$/.test(p)) setPapersEach(p)
    setUrlRestored(true)
  }, [])

  useEffect(() => {
    if (!urlRestored) return
    writeUrlParams({
      date: examDate || null,
      subjects: examDate ? subjects : null,
      papers: examDate ? papersEach : null,
    })
  }, [urlRestored, examDate, subjects, papersEach])

  const target = useMemo(() => {
    const s = Number(subjects)
    const p = Number(papersEach)
    if (!Number.isFinite(s) || !Number.isFinite(p) || s <= 0 || p <= 0) return undefined
    return s * p
  }, [subjects, papersEach])

  const result = useMemo(() => {
    if (nowMs === null || !examDate) return null
    const examMs = Date.parse(`${examDate}T08:00:00`)
    if (!Number.isFinite(examMs)) return null
    return buildCountdown(examMs, nowMs, target)
  }, [nowMs, examDate, target])

  return (
    <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      {/* Inputs */}
      <div className="space-y-4">
        <label className="block rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4">
          <span className="ms-body-2 font-semibold">Your first exam date</span>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 text-base"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4">
            <span className="ms-body-2 font-semibold">Subjects</span>
            <input
              inputMode="numeric"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value.replace(/[^\d]/g, ''))}
              className="mt-2 min-h-[44px] w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 text-base"
              placeholder="3"
            />
          </label>
          <label className="block rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-4">
            <span className="ms-body-2 font-semibold">Past papers each</span>
            <input
              inputMode="numeric"
              value={papersEach}
              onChange={(e) => setPapersEach(e.target.value.replace(/[^\d]/g, ''))}
              className="mt-2 min-h-[44px] w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 text-base"
              placeholder="8"
            />
          </label>
        </div>
        <p className="ms-micro">
          The pacing target is simply subjects × papers each — a rough plan, not a rule. Adjust to
          how many papers exist for your syllabus.
        </p>
      </div>

      {/* Result */}
      <div
        className="rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-6"
        aria-live="polite"
      >
        {!result ? (
          <p className="ms-body-2">
            Pick your exam date to see the countdown and a revision pacing plan.
          </p>
        ) : (
          <>
            <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
              {result.daysLeft > 0 ? 'Days until your exam' : 'Exam day'}
            </p>
            <div className="font-[family-name:var(--ec-font-mono,ui-monospace)] text-5xl font-bold leading-none text-[var(--ec-text-primary)]">
              {result.daysLeft}
              {result.weeksLeft > 0 && (
                <span className="ml-2 text-2xl text-[var(--ec-text-secondary)]">
                  · {result.weeksLeft} wk
                </span>
              )}
            </div>

            <h2 className="ms-h3 mt-5" style={{ fontSize: '1.1rem' }}>
              {result.headline}
            </h2>
            <p className="ms-body-2 mt-2">{result.advice}</p>

            {result.papersPerWeek !== null && (
              <p className="ms-body-2 mt-4 rounded-md bg-[color-mix(in_srgb,var(--ec-brand)_10%,transparent)] p-3">
                To clear your target, aim for about{' '}
                <strong>
                  {result.papersPerWeek} past paper{result.papersPerWeek === 1 ? '' : 's'} per week
                </strong>
                , marked against the official scheme.
              </p>
            )}

            <Link
              href="/mark"
              className="ec-btn-primary mt-5 inline-flex min-h-[44px] items-center gap-2"
            >
              Mark a past paper free <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
