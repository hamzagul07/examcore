'use client'

import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

type TiltCardProps = {
  children: ReactNode
  className?: string
  /** Maximum rotation in degrees applied to the card edges. 1-10. */
  intensity?: number
  /** If true, paint a cursor-tracking emerald halo over the card. */
  glow?: boolean
  /** If true, lift content slightly on Z so it floats over the surface. */
  liftContent?: boolean
  style?: CSSProperties
}

/**
 * Mouse-tracking 3D tilt with spring physics.
 *
 * - Uses framer-motion springs so the return-to-rest motion overshoots
 *   slightly, which is what makes the effect feel premium instead of janky.
 * - Disabled on touch devices (where there's no hover signal).
 * - Reduced-motion users get a static card with no tracking.
 * - The wrapper holds the perspective; the inner motion.div holds the tilt.
 *   Children further lift via translateZ if `liftContent` is on.
 */
export function TiltCard({
  children,
  className = '',
  intensity = 6,
  glow = true,
  liftContent = true,
  style,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isTouch =
      'ontouchstart' in window ||
      (navigator.maxTouchPoints !== undefined && navigator.maxTouchPoints > 0)
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    setEnabled(!isTouch && !prefersReducedMotion)
  }, [])

  // Raw motion values driven by the pointer.
  const rotateXRaw = useMotionValue(0)
  const rotateYRaw = useMotionValue(0)

  // Spring-wrapped so the card eases back to rest with a tiny overshoot.
  const rotateX = useSpring(rotateXRaw, {
    stiffness: 250,
    damping: 22,
    mass: 0.6,
  })
  const rotateY = useSpring(rotateYRaw, {
    stiffness: 250,
    damping: 22,
    mass: 0.6,
  })

  // Compose a single transform string off the springs. Avoids per-frame
  // React re-renders.
  const transform = useTransform(
    [rotateX, rotateY],
    ([x, y]) =>
      `perspective(1200px) rotateX(${x as number}deg) rotateY(${y as number}deg)`
  )

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (!enabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const px = (x / rect.width) * 2 - 1 // -1 .. 1
    const py = (y / rect.height) * 2 - 1
    rotateXRaw.set(-py * intensity)
    rotateYRaw.set(px * intensity)
    setGlowPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 })
  }

  function handleMouseLeave() {
    rotateXRaw.set(0)
    rotateYRaw.set(0)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group/tilt relative ${className}`}
      style={{ perspective: 1200, ...style }}
    >
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          transform: enabled ? transform : undefined,
        }}
        className="relative h-full w-full"
      >
        {/* Cursor-tracking glow — sits above the card surface, under content. */}
        {glow && enabled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
            style={{
              background: `radial-gradient(520px circle at ${glowPos.x}% ${glowPos.y}%, rgba(16, 185, 129, 0.18), transparent 50%)`,
              borderRadius: 'inherit',
            }}
          />
        )}

        {/* Content. translateZ pops it off the surface during tilt. */}
        <div
          style={liftContent && enabled ? { transform: 'translateZ(24px)' } : undefined}
          className="relative h-full w-full"
        >
          {children}
        </div>
      </motion.div>
    </div>
  )
}
