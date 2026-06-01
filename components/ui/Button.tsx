'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
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
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
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
  sm: 'min-h-[44px] px-3.5 py-2 text-sm rounded-xl',
  md: 'min-h-[44px] px-5 py-2.5 text-sm rounded-2xl',
  lg: 'min-h-[48px] px-6 py-3.5 text-base rounded-2xl',
}

/* Variant base classes. Spring transform comes from framer; visual chrome
   (gradient, glow, border) is layered on per-variant. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: cn(
    'relative inline-flex items-center justify-center gap-2 font-semibold tracking-tight text-white',
    'bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600',
    'shadow-[0_4px_24px_rgba(16,185,129,0.4),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(0,0,0,0.05)]',
    'hover:shadow-[0_8px_32px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.3)]',
    'transition-shadow duration-200'
  ),
  secondary: cn(
    'relative inline-flex items-center justify-center gap-2 font-semibold tracking-tight text-slate-900',
    'bg-white/70 backdrop-blur-xl border border-slate-200/80',
    'shadow-[0_2px_12px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]',
    'hover:bg-white hover:shadow-[0_8px_24px_rgba(15,23,42,0.1)]',
    'transition-all duration-200'
  ),
  ghost: cn(
    'relative inline-flex items-center justify-center gap-2 font-semibold tracking-tight text-slate-700',
    'bg-transparent',
    'hover:bg-slate-900/5'
  ),
  danger: cn(
    'relative inline-flex items-center justify-center gap-2 font-semibold tracking-tight text-red-700',
    'bg-white/70 backdrop-blur-xl border border-red-200/70',
    'shadow-[0_2px_12px_rgba(239,68,68,0.08)]',
    'hover:bg-red-50/80 hover:border-red-300 hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)]'
  ),
}

/**
 * Premium button — spring-physics interactions powered by framer-motion.
 *
 * - whileHover lifts the button slightly with a small scale bump.
 * - whileTap dips it back down.
 * - Variants ship gradient fills + colored shadows so the hover state is
 *   visibly stronger, not just transformed.
 *
 * The matching .btn-primary / .ec-btn-secondary / .ec-btn-ghost CSS classes still
 * exist in globals.css for non-component callers (Link-as-button, etc.).
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
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
    const isDisabled = disabled || isLoading

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
        whileHover={isDisabled ? undefined : { y: -2, scale: 1.02 }}
        whileTap={isDisabled ? undefined : { y: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18, mass: 0.6 }}
        onClick={onClick}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          fullWidth && 'w-full',
          pulse && !isDisabled && variant === 'primary' && 'brand-pulse',
          isDisabled && 'cursor-not-allowed opacity-60',
          className
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
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
