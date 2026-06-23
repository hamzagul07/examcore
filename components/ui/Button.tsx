'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  ButtonLoadingState,
  type ButtonLoadingMode,
} from '@/components/ui/ButtonLoadingState'
import { triggerPrimaryHaptic } from '@/lib/hooks/useTapFeedback'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'underline'
type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Explicit prop surface. We pick the HTML button props we actually use across
 * the app — going through Omit<React.Button…, keyof HTMLMotionProps> strips
 * common props like `disabled` and `children` because framer also defines them.
 */
export interface ButtonProps {
  children?: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  /** Alias for isLoading — either enables loading state. */
  loading?: boolean
  isLoading?: boolean
  loadingText?: string
  loadingMode?: ButtonLoadingMode
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  /** Light haptic on tap. Defaults true for primary, false otherwise. */
  haptic?: boolean
  /** Render full width (e.g. for form submit buttons in cards). */
  fullWidth?: boolean
  /** Apply the subtle brand pulsing aura. Use on a single hero CTA only. */
  pulse?: boolean
  /** Forwarded to the underlying <button>. */
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  value?: string | number | readonly string[]
  form?: string
  autoFocus?: boolean
  tabIndex?: number
  title?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  'aria-pressed'?: boolean | 'mixed'
  'aria-expanded'?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  onFocus?: React.FocusEventHandler<HTMLButtonElement>
  onBlur?: React.FocusEventHandler<HTMLButtonElement>
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-5 py-2 text-sm',
  md: 'min-h-[44px] px-7 py-3.5 text-base',
  lg: 'min-h-[48px] px-7 py-3.5 text-base',
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'ec-btn-primary',
  secondary: 'ec-btn-secondary',
  ghost: 'ec-btn-ghost',
  underline: 'ec-btn-underline',
  danger: cn(
    'ec-btn-secondary border-[color-mix(in_srgb,var(--ec-chip-critical-text)_40%,transparent)] ec-score-low',
    'hover:border-[color-mix(in_srgb,var(--ec-chip-critical-text)_50%,transparent)] hover:bg-[var(--ec-chip-critical-bg)]'
  ),
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = 'primary',
      size = 'md',
      loading,
      isLoading: isLoadingProp = false,
      loadingText,
      loadingMode = 'shimmer',
      leftIcon,
      rightIcon,
      haptic,
      fullWidth = false,
      pulse = false,
      className,
      children,
      disabled,
      type = 'button',
      onClick,
      onFocus,
      onBlur,
      id,
      name,
      value,
      form,
      autoFocus,
      tabIndex,
      title,
    } = props

    const isLoading = loading ?? isLoadingProp
    const isDisabled = disabled || isLoading
    const useHaptic = haptic ?? variant === 'primary'

    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
      if (useHaptic && !isDisabled) {
        triggerPrimaryHaptic()
      }
      onClick?.(e)
    }

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        id={id}
        name={name}
        value={value}
        form={form}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        title={title}
        aria-label={props['aria-label']}
        aria-labelledby={props['aria-labelledby']}
        aria-describedby={props['aria-describedby']}
        aria-pressed={props['aria-pressed']}
        aria-expanded={props['aria-expanded']}
        aria-busy={isLoading || undefined}
        data-loading={isLoading ? 'true' : undefined}
        whileHover={isDisabled ? undefined : { y: -1 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22, mass: 0.55 }}
        onClick={handleClick}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          variant === 'primary' && size === 'sm' && 'ec-btn-primary--sm',
          variant === 'ghost' && size === 'sm' && 'ec-btn-ghost--sm',
          fullWidth && 'w-full',
          pulse && !isDisabled && variant === 'primary' && 'brand-pulse',
          className
        )}
      >
        {isLoading ? (
          <ButtonLoadingState mode={loadingMode} loadingText={loadingText}>
            {children}
          </ButtonLoadingState>
        ) : (
          <>
            {leftIcon && (
              <span className="-ml-0.5 inline-flex shrink-0">{leftIcon}</span>
            )}
            <span>{children}</span>
            {rightIcon && (
              <span className="-mr-0.5 inline-flex shrink-0">{rightIcon}</span>
            )}
          </>
        )}
      </motion.button>
    )
  }
)
