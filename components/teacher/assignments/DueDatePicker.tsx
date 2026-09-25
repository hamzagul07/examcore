'use client'

import { useMemo, useSyncExternalStore } from 'react'
import {
  FALLBACK_TIME_ZONE,
  defaultDueChips,
  extensionChips,
  formatDueLong,
  fromLocalInputValue,
  safeTimeZone,
  sameMinute,
  toLocalInputValue,
  type DueChip,
} from '@/components/teacher/assignments/format'

const noSubscribe = () => () => {}
const onClient = () => true
const onServer = () => false

function browserTimeZone(): string {
  try {
    return safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? FALLBACK_TIME_ZONE
  } catch {
    return FALLBACK_TIME_ZONE
  }
}

/**
 * A deadline picker (docs/TEACHER_SYSTEM_SPEC.md §4 composer "When": a
 * datetime-local field plus quick chips "Fri 4pm" / "Mon 9am"; the same
 * control extends a deadline in the LateList sheet with "+1 day" chips).
 *
 * The value is an ISO instant or null. The field and the chips work in the
 * browser's own time zone, and the pick is read back in words ("Friday 2
 * October 2026, 4pm — Europe/London") so a teacher can see exactly what the
 * class will be told. Nothing time-dependent renders on the server: the
 * chips and the field fill in after hydration, so a server in another zone
 * can never disagree with the browser.
 */
export function DueDatePicker({
  id,
  label,
  value,
  onChange,
  chips = 'default',
  allowClear = true,
  clearLabel = 'No due date',
  min,
  hint,
  error,
  disabled = false,
}: {
  id: string
  label: string
  value: string | null
  onChange: (iso: string | null) => void
  /** 'default' → Fri 4pm / Mon 9am; `{ base }` → +1 day / +3 days / +1 week from `base`. */
  chips?: 'default' | { base: string } | 'none'
  allowClear?: boolean
  clearLabel?: string
  /** Earliest acceptable instant (ISO); the field will not offer anything before it. */
  min?: string | null
  hint?: string
  error?: string
  disabled?: boolean
}) {
  const client = useSyncExternalStore(noSubscribe, onClient, onServer)
  const tz = useSyncExternalStore(noSubscribe, browserTimeZone, () => FALLBACK_TIME_ZONE)
  const base = typeof chips === 'object' ? chips.base : null
  const mode = chips === 'none' ? 'none' : base ? 'extend' : 'default'
  const quick: DueChip[] = useMemo(() => {
    if (!client || mode === 'none') return []
    if (mode === 'extend' && base) {
      const d = new Date(base)
      return Number.isFinite(d.getTime()) ? extensionChips(d) : []
    }
    return defaultDueChips(new Date())
  }, [client, mode, base])

  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const readbackId = `${id}-readback`
  const describedBy = [hint ? hintId : null, error ? errorId : null, readbackId].filter(Boolean).join(' ')
  const inputValue = client && value ? toLocalInputValue(new Date(value)) : ''
  const minValue = client && min ? toLocalInputValue(new Date(min)) : undefined
  const readback = client ? (value ? `${formatDueLong(value, tz)} — ${tz.replace(/_/g, ' ')}` : clearLabel) : ''

  return (
    <div className="ms-set-composer__field">
      <label htmlFor={id} className="ms-set-composer__label">
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        className="ec-input min-h-[44px] w-full max-w-xs"
        value={inputValue}
        min={minValue}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          const next = e.target.value ? fromLocalInputValue(e.target.value) : null
          onChange(next ? next.toISOString() : null)
        }}
      />
      {quick.length > 0 || allowClear ? (
        <div className="ms-set-composer__chips" role="group" aria-label={`Quick picks for ${label.toLowerCase()}`}>
          {quick.map((c) => (
            <button
              key={c.key}
              type="button"
              className="ms-set-composer__chip"
              aria-pressed={sameMinute(value, c.date)}
              title={formatDueLong(c.date.toISOString(), tz) ?? undefined}
              disabled={disabled}
              onClick={() => onChange(c.date.toISOString())}
            >
              {c.label}
            </button>
          ))}
          {allowClear ? (
            <button
              type="button"
              className="ms-set-composer__chip"
              aria-pressed={value === null}
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              {clearLabel}
            </button>
          ) : null}
        </div>
      ) : null}
      <p id={readbackId} className="ms-set-composer__hint mb-0" aria-live="polite">
        {readback}
      </p>
      {hint ? (
        <p id={hintId} className="ms-set-composer__hint mb-0">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="ms-teacher-start__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
