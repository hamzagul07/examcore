'use client'

import { useCallback, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
  disabled?: boolean
}

type Props<T extends string> = {
  /** Pass `null` when nothing is selected yet (e.g. optional ask). */
  value: T | null
  onChange: (value: T) => void
  options: SegmentedOption<T>[]
  /** Accessible name for the radiogroup. */
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  className?: string
  /** Class on each segment button. Active gets `on` + aria-checked. */
  optionClassName?: string
  disabled?: boolean
}

/**
 * Shared mutually-exclusive choice control (Codex A11Y-01 / DS primitive).
 * Radiogroup + roving tabindex + arrow keys.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = '',
  optionClassName = '',
  disabled = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: Props<T>) {
  const listId = useId()
  const refs = useRef<Array<HTMLButtonElement | null>>([])

  const enabledIndexes = options
    .map((opt, i) => ({ opt, i }))
    .filter(({ opt }) => !opt.disabled && !disabled)
    .map(({ i }) => i)

  const focusIndex = useCallback(
    (index: number) => {
      const el = refs.current[index]
      el?.focus()
    },
    []
  )

  const selectedEnabledPos = enabledIndexes.indexOf(
    options.findIndex((o) => o.value === value)
  )
  const rovingFallback = enabledIndexes[0] ?? 0

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || enabledIndexes.length === 0) return
    const current = selectedEnabledPos >= 0 ? selectedEnabledPos : 0
    let next = current
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      next = (current + 1) % enabledIndexes.length
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      next = (current - 1 + enabledIndexes.length) % enabledIndexes.length
    } else if (e.key === 'Home') {
      e.preventDefault()
      next = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      next = enabledIndexes.length - 1
    } else {
      return
    }
    const optIndex = enabledIndexes[next]
    const opt = options[optIndex]
    if (!opt) return
    onChange(opt.value)
    focusIndex(optIndex)
  }

  return (
    <div
      id={listId}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={className}
      onKeyDown={onKeyDown}
    >
      {options.map((opt, i) => {
        const checked = opt.value === value
        const isDisabled = disabled || !!opt.disabled
        const tabStop =
          checked || (value === null && i === rovingFallback && !isDisabled)
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={isDisabled || undefined}
            disabled={isDisabled}
            tabIndex={tabStop ? 0 : -1}
            className={`${optionClassName}${checked ? ' on' : ''}${
              isDisabled ? ' is-disabled' : ''
            }`.trim()}
            onClick={() => {
              if (isDisabled) return
              onChange(opt.value)
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
