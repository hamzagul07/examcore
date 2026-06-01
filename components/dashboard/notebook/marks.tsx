'use client'

import { motion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'

/** feTurbulence SVG filters are expensive on mobile — desktop fine pointer only. */
function useSvgRoughFilter(): boolean {
  const [rough, setRough] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine) and (min-width: 1024px)')
    const sync = () => setRough(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return rough
}

type MarkProps = {
  color?: string
  size?: number
  animate?: boolean
  delay?: number
  className?: string
}

type HandDrawnPathProps = {
  d: string
  color: string
  strokeWidth: number
  animate: boolean
  delay: number
  duration?: number
  fill?: string
  className?: string
  viewBox?: string
  width?: number | string
  height?: number | string
  rough?: boolean
  opacity?: number
}

function HandDrawnPath({
  d,
  color,
  strokeWidth,
  animate,
  delay,
  duration = 0.4,
  fill = 'none',
  className,
  viewBox = '0 0 24 24',
  width,
  height,
  rough: roughProp,
  opacity = 1,
}: HandDrawnPathProps) {
  const roughDefault = useSvgRoughFilter()
  const rough = roughProp ?? roughDefault
  const filterId = useId()

  return (
    <svg
      className={className}
      viewBox={viewBox}
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      overflow="visible"
      style={{ opacity }}
    >
      {rough && (
        <defs>
          <filter id={filterId} x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence baseFrequency="0.06" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="1.2" />
          </filter>
        </defs>
      )}
      <motion.path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={fill}
        vectorEffect="non-scaling-stroke"
        style={rough ? { filter: `url(#${filterId})` } : undefined}
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={
          animate
            ? { duration, ease: 'easeOut', delay }
            : { duration: 0 }
        }
      />
    </svg>
  )
}

export function HandUnderline({
  color = 'var(--ec-notebook-ink)',
  animate = true,
  delay = 0,
  className,
}: MarkProps) {
  return (
    <HandDrawnPath
      className={`block h-2 w-full ${className ?? ''}`}
      viewBox="0 0 100 12"
      width="100%"
      height={8}
      d="M 2 8 Q 22 4 48 9 T 98 7"
      color={color}
      strokeWidth={2}
      animate={animate}
      delay={delay}
      duration={0.45}
    />
  )
}

export function HandCheckmark({
  color = 'var(--ec-notebook-ink)',
  size = 16,
  animate = true,
  delay = 0,
  className,
}: MarkProps) {
  return (
    <HandDrawnPath
      className={`shrink-0 ${className ?? ''}`}
      width={size}
      height={size}
      d="M 3 12 L 9 18 L 21 4"
      color={color}
      strokeWidth={2.2}
      animate={animate}
      delay={delay}
      duration={0.3}
    />
  )
}

export function HandStar({
  color = 'var(--ec-notebook-ink)',
  size = 14,
  animate = true,
  delay = 0,
  className,
}: MarkProps) {
  return (
    <HandDrawnPath
      className={`shrink-0 ${className ?? ''}`}
      width={size}
      height={size}
      d="M 12 2 L 14.5 9 L 22 9.5 L 16.5 14 L 18.5 21.5 L 12 17.5 L 5.5 21.5 L 7.5 14 L 2 9.5 L 9.5 9 Z"
      color={color}
      strokeWidth={1.6}
      animate={animate}
      delay={delay}
      duration={0.35}
    />
  )
}

const ARROW_PATHS = {
  up: 'M 12 20 L 12 4 M 6 10 L 12 4 L 18 10',
  right: 'M 4 12 L 20 12 M 14 6 L 20 12 L 14 18',
  down: 'M 12 4 L 12 20 M 6 14 L 12 20 L 18 14',
} as const

export function HandArrow({
  direction = 'right',
  color = 'var(--ec-notebook-ink)',
  size = 16,
  animate = true,
  delay = 0,
  className,
}: MarkProps & { direction?: keyof typeof ARROW_PATHS }) {
  return (
    <HandDrawnPath
      className={`shrink-0 ${className ?? ''}`}
      width={size}
      height={size}
      d={ARROW_PATHS[direction]}
      color={color}
      strokeWidth={2}
      animate={animate}
      delay={delay}
      duration={0.3}
    />
  )
}

export function HandBullet({
  color = 'var(--ec-notebook-ink)',
  size = 8,
  animate = true,
  delay = 0,
  className,
}: MarkProps) {
  return (
    <HandDrawnPath
      className={`shrink-0 ${className ?? ''}`}
      width={size}
      height={size}
      d="M 6 6 m -3.2 0 a 3.2 3.2 0 1 0 6.4 0 a 3.2 3.2 0 1 0 -6.4 0"
      color={color}
      strokeWidth={0}
      fill={color}
      animate={animate}
      delay={delay}
      duration={0.2}
      rough={false}
    />
  )
}

export function HandDivider({
  color = 'var(--ec-notebook-ink)',
  animate = true,
  delay = 0,
  className,
}: MarkProps) {
  return (
    <HandDrawnPath
      className={`block h-3 w-full ${className ?? ''}`}
      viewBox="0 0 100 8"
      width="100%"
      height={12}
      d="M 1 4 Q 18 6 35 3 T 68 5 T 99 4"
      color={color}
      strokeWidth={1.5}
      animate={animate}
      delay={delay}
      duration={0.35}
      opacity={0.45}
    />
  )
}
