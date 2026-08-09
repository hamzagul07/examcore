'use client'

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type FieldBase = {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  className?: string
  labelClassName?: string
}

type InputFieldProps = FieldBase & {
  as?: 'input'
  inputProps?: InputHTMLAttributes<HTMLInputElement>
}

type TextareaFieldProps = FieldBase & {
  as: 'textarea'
  inputProps?: TextareaHTMLAttributes<HTMLTextAreaElement>
}

type Props = InputFieldProps | TextareaFieldProps

/**
 * Labelled form field with 44px touch target and linked hint/error (DS-03).
 * Uses `ec-input` so product forms stay on brand tokens.
 */
export function Field(props: Props) {
  const autoId = useId()
  const {
    label,
    hint,
    error,
    className = '',
    labelClassName = 'label-overline mb-2 inline-block',
  } = props
  const id = props.inputProps?.id ?? autoId
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId, props.inputProps?.['aria-describedby']]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className={cn('ms-field', className)}>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      {props.as === 'textarea' ? (
        <textarea
          {...props.inputProps}
          id={id}
          className={cn('ec-input', props.inputProps?.className)}
          aria-invalid={error ? true : props.inputProps?.['aria-invalid']}
          aria-describedby={describedBy}
        />
      ) : (
        <input
          {...props.inputProps}
          id={id}
          className={cn('ec-input min-h-[44px]', props.inputProps?.className)}
          aria-invalid={error ? true : props.inputProps?.['aria-invalid']}
          aria-describedby={describedBy}
        />
      )}
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-[var(--ec-text-secondary)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs ec-score-low" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
