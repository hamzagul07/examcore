'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Option<T extends string> = {
  value: T
  label: ReactNode
  disabled?: boolean
}

type Props<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: Option<T>[]
  'aria-label'?: string
  'aria-labelledby'?: string
  className?: string
  optionClassName?: string
  disabled?: boolean
}

/** Accessible radio-group styled as desk pills (DS primitive). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  optionClassName = 'ec-pill',
  disabled,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        const blocked = disabled || opt.disabled
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={blocked}
            className={cn(
              optionClassName,
              'min-h-[44px]',
              selected
                ? 'border-[color-mix(in_srgb,var(--ec-brand)_50%,transparent)] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]'
                : '',
              blocked ? 'opacity-50' : ''
            )}
            onClick={() => {
              if (!blocked) onChange(opt.value)
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
