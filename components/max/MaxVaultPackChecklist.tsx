'use client'

import { useCallback, useState, useTransition } from 'react'
import Link from 'next/link'
import type { MaxExamPack } from '@/lib/max/build-exam-pack'
import { drillHref } from '@/lib/insights/drill-link'

/**
 * Interactive Max pack checklist — ticks persist to max_sprint_day_completion.
 */
export function MaxVaultPackChecklist({
  pack,
  initialCompleted,
}: {
  pack: MaxExamPack
  initialCompleted: number[]
}) {
  const [completed, setCompleted] = useState(() => new Set(initialCompleted))
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = useCallback(
    (dayNumber: number, next: boolean) => {
      setError(null)
      setCompleted((prev) => {
        const copy = new Set(prev)
        if (next) copy.add(dayNumber)
        else copy.delete(dayNumber)
        return copy
      })
      startTransition(async () => {
        try {
          const res = await fetch('/api/max/sprint-day', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subjectCode: pack.subjectCode,
              weekLabel: pack.completionKey || pack.weekLabel,
              dayNumber,
              completed: next,
            }),
          })
          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as { error?: string } | null
            throw new Error(body?.error || 'Could not save')
          }
        } catch (e) {
          setCompleted((prev) => {
            const copy = new Set(prev)
            if (next) copy.delete(dayNumber)
            else copy.add(dayNumber)
            return copy
          })
          setError(e instanceof Error ? e.message : 'Could not save')
        }
      })
    },
    [pack.subjectCode, pack.completionKey, pack.weekLabel]
  )

  const validDays = pack.days.map((d) => d.day)
  const doneCount = validDays.filter((d) => completed.has(d)).length
  const total = pack.days.length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-body m-0 text-[var(--ec-text-secondary)]">
          Built from your mastery graph + real past-paper rows — tick days as you finish
          them. Progress syncs across devices.
          {pack.daysLeft !== null
            ? ` · ${pack.daysLeft} day${pack.daysLeft === 1 ? '' : 's'} to exam`
            : null}
        </p>
        <p className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]">
          {doneCount}/{total} done
          {pending ? ' · saving…' : ''}
        </p>
      </div>
      {error ? (
        <p className="text-caption m-0 text-[var(--ec-acc-rose)]">{error}</p>
      ) : null}

      {pack.isSprint && pack.timedPapers.length > 0 ? (
        <div className="ms-vault__panel ms-vault__panel--rose !shadow-none p-3">
          <p className="ms-overline m-0 mb-2 text-[var(--ec-acc-rose)]">Three timed papers</p>
          <ul className="m-0 list-none space-y-2 pl-0">
            {pack.timedPapers.map((p) => {
              const external = p.href.startsWith('http')
              return (
                <li key={p.label}>
                  {external ? (
                    <a
                      href={p.href}
                      className="ec-link font-semibold"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {p.label} ↗
                    </a>
                  ) : (
                    <Link href={p.href} className="ec-link font-semibold">
                      {p.label}
                    </Link>
                  )}
                  <span className="text-[var(--ec-text-secondary)]">
                    {' '}
                    · {p.minutes} min under timed conditions, then mark on MarkScheme
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <ol className="ms-vault__days">
        {pack.days.map((day) => {
          const checked = completed.has(day.day)
          const kindClass =
            day.kind === 'timed_paper'
              ? 'ms-vault__day--timed'
              : day.kind === 'review'
                ? 'ms-vault__day--review'
                : 'ms-vault__day--drill'
          return (
            <li
              key={day.day}
              className={`ms-vault__day ${kindClass}${checked ? ' is-done' : ''}`}
            >
              <label className="ms-vault__day-check">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={pending}
                  onChange={(e) => toggle(day.day, e.target.checked)}
                  aria-label={`Mark day ${day.day} complete`}
                />
                  <span aria-hidden>{day.day}</span>
              </label>
              <div className="ms-vault__day-body">
                <span className="ms-vault__day-kind">
                  {day.kind === 'timed_paper'
                    ? 'Timed paper'
                    : day.kind === 'review'
                      ? 'Review'
                      : 'Drill'}
                </span>
                <p className="m-0 font-semibold text-[var(--ec-text-primary)]">{day.focus}</p>
                {day.paperHref ? (
                  <div className="mt-2">
                    <Link href={day.paperHref} className="ec-link font-semibold">
                      Open past papers →
                    </Link>
                  </div>
                ) : null}
                {day.drills.length > 0 ? (
                  <ul className="mt-2 list-none space-y-1 pl-0">
                    {day.drills.map((d) => (
                      <li key={`${d.paperCode}-${d.questionNumber}`}>
                        <Link
                          href={drillHref(d, undefined, { returnTo: 'vault' })}
                          className="ec-link font-semibold"
                        >
                          {d.paperCode} Q{d.questionNumber}
                        </Link>
                        <span className="text-[var(--ec-text-secondary)]"> — {d.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
