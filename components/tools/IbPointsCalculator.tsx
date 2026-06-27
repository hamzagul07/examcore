'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, X } from 'lucide-react'
import {
  CORE_GRADES,
  SUBJECT_GRADES,
  computeDiploma,
  type CoreGrade,
  type DiplomaSubject,
  type SubjectGrade,
  type SubjectLevel,
} from '@/lib/ib/points'

const DEFAULT_SUBJECTS: DiplomaSubject[] = [
  { grade: 6, level: 'HL' },
  { grade: 6, level: 'HL' },
  { grade: 6, level: 'HL' },
  { grade: 6, level: 'SL' },
  { grade: 6, level: 'SL' },
  { grade: 6, level: 'SL' },
]

export function IbPointsCalculator() {
  const [subjects, setSubjects] = useState<DiplomaSubject[]>(DEFAULT_SUBJECTS)
  const [tok, setTok] = useState<CoreGrade>('B')
  const [ee, setEe] = useState<CoreGrade>('B')

  function setGrade(i: number, grade: SubjectGrade) {
    setSubjects((prev) => prev.map((s, idx) => (idx === i ? { ...s, grade } : s)))
  }
  function setLevel(i: number, level: SubjectLevel) {
    setSubjects((prev) => prev.map((s, idx) => (idx === i ? { ...s, level } : s)))
  }

  const result = useMemo(() => computeDiploma(subjects, tok, ee), [subjects, tok, ee])
  const hlCount = result.hlCount

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Inputs */}
      <div>
        <p className="ms-overline">Your six subjects</p>
        <div className="mt-3 space-y-3">
          {subjects.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-3"
            >
              <span className="ms-body-2 w-16 shrink-0 font-semibold text-[var(--ec-text-secondary)]">
                Subject {i + 1}
              </span>
              <div className="flex overflow-hidden rounded-md border border-[var(--ec-border)]" role="group" aria-label={`Subject ${i + 1} level`}>
                {(['HL', 'SL'] as SubjectLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevel(i, lvl)}
                    aria-pressed={s.level === lvl}
                    className={`min-h-[40px] px-3 text-sm font-semibold ${
                      s.level === lvl
                        ? 'bg-[var(--ec-brand)] text-white'
                        : 'bg-transparent text-[var(--ec-text-secondary)]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <label className="ml-auto flex items-center gap-2">
                <span className="sr-only">Subject {i + 1} grade</span>
                <select
                  value={s.grade}
                  onChange={(e) => setGrade(i, Number(e.target.value) as SubjectGrade)}
                  className="min-h-[40px] rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 text-base font-semibold"
                >
                  {SUBJECT_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>

        <p className="ms-overline mt-6">Core: TOK &amp; Extended Essay</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-3">
            <span className="ms-body-2 font-semibold">Theory of Knowledge</span>
            <select
              value={tok}
              onChange={(e) => setTok(e.target.value as CoreGrade)}
              className="mt-2 min-h-[40px] w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 text-base font-semibold"
            >
              {CORE_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-3">
            <span className="ms-body-2 font-semibold">Extended Essay</span>
            <select
              value={ee}
              onChange={(e) => setEe(e.target.value as CoreGrade)}
              className="mt-2 min-h-[40px] w-full rounded-md border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 text-base font-semibold"
            >
              {CORE_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hlCount !== 3 && (
          <p className="ms-micro mt-3 text-[var(--ec-brand)]">
            Most candidates take 3 HL + 3 SL. You have {hlCount} HL — the HL/SL point checks below
            apply to the standard 3 + 3 registration.
          </p>
        )}
      </div>

      {/* Result */}
      <div
        className="rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-6"
        aria-live="polite"
      >
        <p className="ms-overline" style={{ color: 'var(--ec-brand)' }}>
          Total points
        </p>
        <div className="font-[family-name:var(--ec-font-mono,ui-monospace)] text-5xl font-bold leading-none text-[var(--ec-text-primary)]">
          {result.total}
          <span className="text-2xl text-[var(--ec-text-secondary)]">/45</span>
        </div>
        <p className="ms-body-2 mt-2">
          {result.subjectTotal} from subjects + {result.bonus} bonus
          {result.bonus === 0 && (tok === 'E' || ee === 'E') ? ' (E grade — no bonus)' : ''}
        </p>

        <div
          className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
            result.awarded
              ? 'bg-[color-mix(in_srgb,var(--ec-brand)_15%,transparent)] text-[var(--ec-brand)]'
              : 'bg-[color-mix(in_srgb,#8f1f1c_12%,transparent)] text-[#8f1f1c]'
          }`}
        >
          {result.awarded ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {result.awarded ? 'Meets the award conditions' : 'A condition is not met'}
        </div>

        <ul className="mt-5 space-y-2">
          {result.conditions.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              {c.pass ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-[#8f1f1c]" aria-hidden />
              )}
              <span className="ms-body-2">
                {c.label}
                {c.detail ? <span className="text-[var(--ec-text-secondary)]"> · {c.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>

        <p className="ms-micro mt-5">
          An estimate of your /45 and the published award conditions. The final diploma also requires
          completing CAS and depends on your exact HL/SL registration — confirm with your coordinator.
        </p>
        <Link
          href="/ib/courses"
          className="ec-btn-primary mt-4 inline-flex min-h-[44px] items-center gap-2"
        >
          Revise free with IB courses <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
