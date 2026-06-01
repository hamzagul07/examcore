'use client'

import { motion, useReducedMotion } from 'framer-motion'

const PARTICLES = [
  { left: '18%', top: '28%', dx: 6, dy: -10, duration: 14 },
  { left: '72%', top: '22%', dx: -8, dy: 8, duration: 16 },
  { left: '45%', top: '68%', dx: 10, dy: 6, duration: 18 },
  { left: '82%', top: '55%', dx: -5, dy: -12, duration: 15 },
  { left: '28%', top: '48%', dx: 7, dy: 9, duration: 17 },
]

export function CountdownParticles({ paused = false }: { paused?: boolean }) {
  const reduce = useReducedMotion()

  if (reduce || paused) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute h-0.5 w-0.5 rounded-full bg-[var(--ec-brand)] opacity-20 will-change-transform"
          style={{ left: p.left, top: p.top }}
          animate={{
            x: [0, p.dx, 0],
            y: [0, p.dy, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
