'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'

type Props = {
  children: ReactNode
}

export function DashboardPresence({ children }: Props) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (reduce) return

    const onMove = (e: MouseEvent) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      setOffset({ x: px * 8, y: py * 6 })
      if (glowRef.current) {
        glowRef.current.style.left = `${e.clientX - rect.left}px`
        glowRef.current.style.top = `${e.clientY - rect.top}px`
      }
    }

    const el = ref.current
    el?.addEventListener('mousemove', onMove)
    return () => el?.removeEventListener('mousemove', onMove)
  }, [reduce])

  useEffect(() => {
    if (reduce || typeof window === 'undefined') return
    const onOrient = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0
      const beta = e.beta ?? 0
      setOffset({ x: (gamma / 45) * 6, y: (beta / 45) * 4 })
    }
    window.addEventListener('deviceorientation', onOrient)
    return () => window.removeEventListener('deviceorientation', onOrient)
  }, [reduce])

  return (
    <div ref={ref} className="dashboard-presence relative min-w-0">
      {!reduce && (
        <div
          ref={glowRef}
          className="pointer-events-none absolute z-0 hidden h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full md:block"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--ec-brand) 5%, transparent) 0%, transparent 70%)',
          }}
          aria-hidden
        />
      )}
      <div
        className={`relative z-[1] transition-transform duration-300 ${reduce ? '' : 'dashboard-presence-breathe'}`}
        style={
          reduce
            ? undefined
            : {
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                background:
                  'radial-gradient(ellipse 80% 50% at 50% 0%, var(--ec-surface) 0%, var(--ec-canvas) 70%)',
              }
        }
      >
        {children}
      </div>
    </div>
  )
}
