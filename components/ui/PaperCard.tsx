import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Padding = 'none' | 'sm' | 'md' | 'lg'

type Props = {
  children: ReactNode
  /** paper = hard slip; brand = branded accent card */
  variant?: 'paper' | 'brand'
  padding?: Padding
  className?: string
  as?: 'div' | 'section'
  id?: string
  style?: CSSProperties
}

/**
 * Server-safe paper slip (DS-03). Prefer this over `Card` when you do not need
 * Framer Motion entry animation.
 */
export function PaperCard({
  children,
  variant = 'paper',
  padding = 'md',
  className,
  as: Tag = 'div',
  id,
  style,
}: Props) {
  return (
    <Tag
      id={id}
      style={style}
      className={cn(
        variant === 'brand' ? 'ec-card-brand' : 'ec-card ec-card--paper',
        padding === 'none' ? '' : padding === 'sm' ? 'p-4 sm:p-5' : padding === 'lg' ? 'p-6 sm:p-10' : 'p-5 sm:p-7',
        className
      )}
    >
      {children}
    </Tag>
  )
}
