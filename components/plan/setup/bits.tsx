'use client'

/**
 * The small pieces the five setup steps share: a step header, a pill group,
 * a time input, and the inline message a field shows once the student has
 * tried to move on. Kept here so each step file reads as its own form.
 */

import type { ReactNode } from 'react'
import type { WizardIssue } from '@/lib/plan/wizard-state'

export function StepHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: ReactNode }) {
  return (
    <header className="ms-rm-setup-head">
      <p className="ec-eyebrow">{eyebrow}</p>
      <h2 className="text-title ms-rm-setup-title">{title}</h2>
      {lead ? <p className="ms-plan-note max-w-prose">{lead}</p> : null}
    </header>
  )
}

/** Messages for one field, shown only after the step was submitted once. */
export function FieldIssues({ issues, field, id }: { issues: WizardIssue[]; field: string; id?: string }) {
  const mine = issues.filter((i) => i.field === field)
  if (mine.length === 0) return null
  return (
    <ul id={id} className="ms-rm-setup-issues" aria-live="polite">
      {mine.map((i, n) => (
        <li key={n}>{i.message}</li>
      ))}
    </ul>
  )
}

export function hasIssue(issues: WizardIssue[], field: string): boolean {
  return issues.some((i) => i.field === field)
}

/** Everything the step still needs, listed once above the navigation. */
export function IssueSummary({ issues }: { issues: WizardIssue[] }) {
  if (issues.length === 0) return null
  return (
    <div className="ms-rm-setup-summary" role="alert">
      <p className="ms-rm-setup-summary__title">Before the next step</p>
      <ul>
        {issues.map((i, n) => (
          <li key={n}>{i.message}</li>
        ))}
      </ul>
    </div>
  )
}

type ChipOption<T extends string | number> = { value: T; label: ReactNode; disabled?: boolean; title?: string }

/**
 * A row of pills. `selected` may hold several values (multi-select) or one.
 * Buttons with aria-pressed, so a screen reader hears "pressed" and the
 * design system's `.ec-pill[aria-pressed='true']` paints the state.
 */
export function Chips<T extends string | number>({
  options,
  selected,
  onToggle,
  disabled,
  label,
  className = '',
}: {
  options: ChipOption<T>[]
  selected: readonly T[]
  onToggle: (value: T) => void
  disabled?: boolean
  label: string
  className?: string
}) {
  return (
    <div className={`ms-rm-setup-chips ${className}`.trim()} role="group" aria-label={label}>
      {options.map((o) => {
        const on = selected.includes(o.value)
        return (
          <button
            key={String(o.value)}
            type="button"
            className={`ec-pill ${on ? 'is-on' : ''}`}
            aria-pressed={on}
            disabled={disabled || o.disabled}
            title={o.title}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function TimeInput({
  id,
  value,
  onChange,
  label,
  disabled,
  invalid,
  describedBy,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  label: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
}) {
  return (
    <input
      id={id}
      type="time"
      className="ec-input ms-rm-setup-time"
      value={value}
      step={300}
      disabled={disabled}
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/** "From 16:00 to 21:00" as two time inputs on one line. */
export function TimeSpan({
  idBase,
  start,
  end,
  onChange,
  disabled,
  invalid,
  label,
}: {
  idBase: string
  start: string
  end: string
  onChange: (next: { start: string; end: string }) => void
  disabled?: boolean
  invalid?: boolean
  label: string
}) {
  return (
    <div className="ms-rm-setup-span" role="group" aria-label={label}>
      <TimeInput id={`${idBase}-start`} value={start} label={`${label} start`} disabled={disabled} invalid={invalid} onChange={(v) => onChange({ start: v, end })} />
      <span className="ms-rm-setup-span__to" aria-hidden>
        to
      </span>
      <TimeInput id={`${idBase}-end`} value={end} label={`${label} end`} disabled={disabled} invalid={invalid} onChange={(v) => onChange({ start, end: v })} />
    </div>
  )
}
