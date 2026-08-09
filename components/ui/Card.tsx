'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

/** Canonical variants. Legacy aliases still accepted for call-site compatibility. */
type CardVariant =
  | 'paper'
  | 'brand'
  | 'glass'
  | 'frost'
  | 'solid'
  | 'default'
  | 'subtle'
  | 'brand-glow'

type CardPadding = 'none' | 'sm' | 'md' | 'lg'

type CardProps = {
  children: React.ReactNode
  variant?: CardVariant
  /** Apply the hover lift effect. Only meaningful for clickable cards. */
  hover?: boolean
  /** Run the entry animation (spring slide-up + fade). Prefer static PaperCard otherwise. */
  animate?: boolean
  padding?: CardPadding
  className?: string
  as?: 'div' | 'section'
  id?: string
  style?: React.CSSProperties
} & Pick<HTMLMotionProps<'div'>, 'onClick' | 'onMouseEnter' | 'onMouseLeave'>

/**
 * Client Card — use `animate` only when motion is required.
 * For static slips, prefer `PaperCard` (no client bundle).
 *
 * DS-03: glass/frost/solid/default/subtle all resolve to paper; brand-glow → brand.
 */
export function Card({
  children,
  variant = 'paper',
  hover = false,
  animate = false,
  padding = 'md',
  className,
  as = 'div',
  id,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: CardProps) {
  const variantClass = pickVariant(variant)
  const paddingClass = pickPadding(padding)
  const hoverClass = hover ? 'ec-card-lift' : ''
  const className_ = cn(variantClass, paddingClass, hoverClass, className)

  if (animate) {
    const MotionTag = as === 'section' ? motion.section : motion.div
    return (
      <MotionTag
        id={id}
        className={className_}
        style={style}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {children}
      </MotionTag>
    )
  }

  const Tag = as
  return (
    <Tag
      id={id}
      className={className_}
      style={style}
      onClick={onClick as React.MouseEventHandler<HTMLElement>}
      onMouseEnter={onMouseEnter as React.MouseEventHandler<HTMLElement>}
      onMouseLeave={onMouseLeave as React.MouseEventHandler<HTMLElement>}
    >
      {children}
    </Tag>
  )
}

function pickVariant(variant: CardVariant): string {
  if (variant === 'brand' || variant === 'brand-glow') return 'ec-card-brand'
  return 'ec-card ec-card--paper'
}

function pickPadding(padding: CardPadding): string {
  switch (padding) {
    case 'none':
      return ''
    case 'sm':
      return 'p-4 sm:p-5'
    case 'lg':
      return 'p-6 sm:p-10'
    case 'md':
    default:
      return 'p-5 sm:p-7'
  }
}
