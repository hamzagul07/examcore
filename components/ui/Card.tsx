'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type CardVariant = 'glass' | 'frost' | 'solid' | 'brand-glow' | 'default' | 'subtle'
type CardPadding = 'none' | 'sm' | 'md' | 'lg'

type CardProps = {
  children: React.ReactNode
  variant?: CardVariant
  /** Apply the hover lift effect. Only meaningful for clickable cards. */
  hover?: boolean
  /** Run the entry animation (spring slide-up + fade). */
  animate?: boolean
  /** Padding tier. `none` lets the caller control padding entirely. */
  padding?: CardPadding
  className?: string
  /**
   * Semantic element. Defaults to `div`. `section` is supported; anything else
   * falls back to `div` since framer-motion needs to know the element shape.
   */
  as?: 'div' | 'section'
  id?: string
  style?: React.CSSProperties
} & Pick<HTMLMotionProps<'div'>, 'onClick' | 'onMouseEnter' | 'onMouseLeave'>

/**
 * Premium glass card primitive.
 *
 * Variants:
 *   - glass:      heavy backdrop-blur, semi-transparent — the new default
 *   - frost:      heavier blur, more translucent — auth shells, hero stats
 *   - solid:      opaque white — when blur is unhelpful (long content, code)
 *   - brand-glow: hero stat / decisive surface — paper card with soft wash
 *   - default:    alias for `glass` (legacy)
 *   - subtle:     alias for `frost` with smaller radius (legacy)
 */
export function Card({
  children,
  variant = 'glass',
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

  // Framer's motion factory works for both div and section.
  const MotionTag = as === 'section' ? motion.section : motion.div

  if (animate) {
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

  // Static (non-animated) variant — render the plain element.
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
  switch (variant) {
    case 'glass':
    case 'default':
      return 'ec-card'
    case 'frost':
      return 'ec-card'
    case 'subtle':
      // Legacy "subtle" — a lighter frost used for nested groups.
      return 'ec-card rounded-2xl'
    case 'solid':
      return 'ec-card'
    case 'brand-glow':
      return 'ec-card-brand'
  }
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
