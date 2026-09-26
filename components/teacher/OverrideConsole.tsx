'use client'

import { MathText } from '@/components/MathText'
import type { ReviewMarkView } from '@/lib/teacher/reviews-query'

export type OverrideFieldError = { part: 'total' | 'marks'; markIndex: number | null; message: string }

export type OverrideConsoleProps = {
  /** 'per_mark' scripts toggle each mark; 'total_only' scripts (bands, criteria, MCQ, whole papers) set the total. */
  marking: 'per_mark' | 'total_only'
  totalOnlyBasis: 'band_result' | 'criteria_results' | 'mcq_breakdown' | 'none' | null
  marks: ReviewMarkView[]
  /** The toggles, index-aligned with `marks`. */
  earned: boolean[]
  onToggle: (index: number) => void
  /** The total input's text (a string, so an empty box stays empty while typing). */
  total: string
  onTotalChange: (value: string) => void
  /** What the toggles add up to, when the script's mark values can be read; null otherwise. */
  suggested: number | null
  onUseSuggested: () => void
  totalMarks: number | null
  /** The marker's band / criteria / MCQ result, for total-only scripts. */
  judgement: Array<{ label: string; value: string }>
  /** A refused field from the last save, so the control can be marked invalid. */
  error: OverrideFieldError | null
  idPrefix: string
}

const BASIS_TEXT: Record<NonNullable<OverrideConsoleProps['totalOnlyBasis']>, string> = {
  band_result: 'This answer was marked against level descriptors, so only its total can change.',
  criteria_results: 'This answer was marked against assessment criteria, so only its total can change.',
  mcq_breakdown: 'This answer sheet was marked question by question, so only its total can change.',
  none: 'This script has no per-mark list, so only its total can change.',
}

/**
 * The OV panel of the review console: a toggle per mark (aria-pressed =
 * awarded) and the new total. Controlled — the console owns the state and
 * does the saving, and passes back the field the server refused (400
 * `{field}`), which is marked invalid here and described next to it.
 *
 * The marker's reasoning is shown, never edited: the route carries it across
 * from the stored entry, so the console only sends ids and `earned`.
 */
export function OverrideConsole({
  marking,
  totalOnlyBasis,
  marks,
  earned,
  onToggle,
  total,
  onTotalChange,
  suggested,
  onUseSuggested,
  totalMarks,
  judgement,
  error,
  idPrefix,
}: OverrideConsoleProps) {
  const totalErrorId = `${idPrefix}-total-error`
  const marksErrorId = `${idPrefix}-marks-error`
  const totalHintId = `${idPrefix}-total-hint`
  const totalNumber = total.trim() === '' ? null : Number(total)
  const showSuggestion = suggested !== null && totalNumber !== suggested
  const changed = marks.filter((m, i) => earned[i] !== m.earned).length

  return (
    <div className="flex flex-col gap-4">
      {marking === 'per_mark' ? (
        <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby={error?.part === 'marks' ? marksErrorId : undefined}>
          <legend className="ms-review-console__title mb-2">
            Marks{changed > 0 ? ` · ${changed} changed` : ''}
          </legend>
          <ul className="ms-review-console__marks">
            {marks.map((m, i) => {
              const on = earned[i] === true
              const invalid = error?.part === 'marks' && error.markIndex === i
              const code = m.type ?? String(m.mark_id)
              return (
                <li key={`${String(m.mark_id)}-${i}`}>
                  <button
                    type="button"
                    className={`ms-review-console__mark${invalid ? ' outline outline-2 outline-offset-1 outline-[var(--ec-ink-crimson)]' : ''}`}
                    aria-pressed={on}
                    aria-describedby={invalid ? marksErrorId : undefined}
                    onClick={() => onToggle(i)}
                  >
                    <span className="ms-review-console__mark-id">{code}</span>
                    <span className="line-clamp-2 min-w-0">
                      {m.reasoning ? <MathText text={m.reasoning} /> : <span className="text-[var(--ec-text-faint)]">No reasoning given</span>}
                    </span>
                    <span className="ms-review-console__mark-state">
                      <span aria-hidden>{on ? '✓' : '✗'}</span>
                      <span className="sr-only">{on ? 'awarded' : 'not awarded'}</span>
                      {on !== m.earned ? <span className="sr-only"> (changed)</span> : null}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {error?.part === 'marks' ? (
            <p id={marksErrorId} className="mt-2 text-sm text-[var(--ec-ink-crimson)]">
              {error.message}
            </p>
          ) : null}
        </fieldset>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-[var(--ec-text-secondary)]">{BASIS_TEXT[totalOnlyBasis ?? 'none']}</p>
          {judgement.length > 0 ? (
            <dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
              {judgement.map((j, i) => (
                <div key={`${j.label}-${i}`} className="contents">
                  <dt className="min-w-0 text-[var(--ec-text-secondary)]">{j.label}</dt>
                  <dd className="m-0 font-mono tabular-nums text-[var(--ec-text-primary)]">{j.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="ms-review-console__total" htmlFor={`${idPrefix}-total`}>
          <span>
            New total
            {totalMarks !== null ? (
              <span className="ml-1 font-normal text-[var(--ec-text-secondary)]">out of {totalMarks}</span>
            ) : null}
          </span>
          <input
            id={`${idPrefix}-total`}
            type="number"
            inputMode="numeric"
            min={0}
            max={totalMarks ?? undefined}
            step={1}
            value={total}
            onChange={(e) => onTotalChange(e.target.value)}
            className="ec-input"
            aria-invalid={error?.part === 'total' || undefined}
            aria-describedby={[error?.part === 'total' ? totalErrorId : null, showSuggestion ? totalHintId : null]
              .filter(Boolean)
              .join(' ') || undefined}
          />
        </label>
        {showSuggestion ? (
          <p id={totalHintId} className="m-0 flex flex-wrap items-center justify-end gap-2 text-sm text-[var(--ec-text-secondary)]">
            The ticks add up to {suggested}.
            <button type="button" onClick={onUseSuggested} className="ec-btn-underline min-h-[44px] px-1">
              Use {suggested}
            </button>
          </p>
        ) : null}
        {error?.part === 'total' ? (
          <p id={totalErrorId} className="m-0 text-right text-sm text-[var(--ec-ink-crimson)]">
            {error.message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
