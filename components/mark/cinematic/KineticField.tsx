'use client'

import { useEffect, useRef } from 'react'
import type { CinematicIntensity } from './types'

/**
 * Subagent A — the kinetic field.
 *
 * A Canvas2D constellation: slow-drifting points that connect to nearby
 * neighbours with thin lines. Density, speed, connection radius and brand
 * saturation are driven by `intensity`, which the orchestrator maps from real
 * SSE marking stages. Every visual parameter is lerped frame-to-frame so state
 * changes glide rather than snap.
 *
 * Why Canvas2D (not Three.js/OGL): a 2D constellation is the natural fit, hits
 * 60fps trivially, adds ~0KB to the bundle, reads brand colour straight from
 * the live `--ec-brand` token (so both themes + live theme switches work), and
 * collapses to "render nothing" under reduced-motion. Three volumetric light
 * would be over-engineering for this narrative.
 */

type IntensityParams = {
  /** Fraction of the pool that is active (0-1). */
  density: number
  /** Velocity multiplier. */
  speed: number
  /** Max distance (px, pre-DPR) at which two points connect. */
  connectDist: number
  /** Opacity of points + lines (0-1). */
  alpha: number
}

const PARAMS: Record<CinematicIntensity, IntensityParams> = {
  calm: { density: 0.5, speed: 0.5, connectDist: 96, alpha: 0.5 },
  reading: { density: 0.7, speed: 0.95, connectDist: 104, alpha: 0.62 },
  marking: { density: 1, speed: 1.25, connectDist: 122, alpha: 0.82 },
  climax: { density: 1, speed: 1.7, connectDist: 138, alpha: 0.95 },
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function parseBrandRgb(): [number, number, number] {
  if (typeof window === 'undefined') return [0, 245, 160]
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ec-brand')
    .trim()
  // Expect hex (#rrggbb or #rgb); fall back to brand green.
  const hex = raw.replace('#', '')
  if (hex.length === 6) {
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ]
  }
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ]
  }
  return [0, 245, 160]
}

type Particle = { x: number; y: number; vx: number; vy: number; r: number }

export function KineticField({
  intensity,
  className,
  reducedParticles = false,
}: {
  intensity: CinematicIntensity
  className?: string
  /** Shrinks the pool for phones / low-power devices. */
  reducedParticles?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Mutable refs so the rAF loop reads the latest values without re-binding.
  const intensityRef = useRef(intensity)
  intensityRef.current = intensity

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const maxPool = reducedParticles ? 56 : 130
    const connectionCap = reducedParticles ? 0.45 : 1
    let brand = parseBrandRgb()

    // Live params that ease toward the target intensity preset.
    const cur: IntensityParams = { ...PARAMS.calm }

    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let cssW = canvas.clientWidth || 600
    let cssH = canvas.clientHeight || 360

    const particles: Particle[] = []
    function seed(n: number) {
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * cssW,
          y: Math.random() * cssH,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: 0.7 + Math.random() * 1.6,
        })
      }
    }
    seed(maxPool)

    function resize() {
      cssW = canvas!.clientWidth || cssW
      cssH = canvas!.clientHeight || cssH
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = Math.floor(cssW * dpr)
      canvas!.height = Math.floor(cssH * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // Re-read brand colour when the theme token flips.
    const themeObserver = new MutationObserver(() => {
      brand = parseBrandRgb()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-ec-theme'],
    })

    let raf = 0
    let running = true

    function frame() {
      if (!running) return
      const target = PARAMS[intensityRef.current]
      // Ease live params toward the target (≈12% per frame → ~0.4s settle).
      cur.density = lerp(cur.density, target.density, 0.06)
      cur.speed = lerp(cur.speed, target.speed, 0.08)
      cur.connectDist = lerp(cur.connectDist, target.connectDist, 0.06)
      cur.alpha = lerp(cur.alpha, target.alpha, 0.06)

      const activeCount = Math.round(maxPool * cur.density)
      const connectDist = cur.connectDist
      const [br, bg, bb] = brand

      ctx!.clearRect(0, 0, cssW, cssH)

      // Move + draw points.
      for (let i = 0; i < activeCount; i++) {
        const p = particles[i]
        p.x += p.vx * cur.speed
        p.y += p.vy * cur.speed
        if (p.x < -20) p.x = cssW + 20
        else if (p.x > cssW + 20) p.x = -20
        if (p.y < -20) p.y = cssH + 20
        else if (p.y > cssH + 20) p.y = -20
      }

      // Connections (O(n^2) over the active set; capped pool keeps this cheap).
      ctx!.lineWidth = 1
      for (let i = 0; i < activeCount; i++) {
        const a = particles[i]
        const jCap = Math.floor(activeCount * connectionCap)
        for (let j = i + 1; j < jCap; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist2 = dx * dx + dy * dy
          if (dist2 < connectDist * connectDist) {
            const t = 1 - Math.sqrt(dist2) / connectDist
            ctx!.strokeStyle = `rgba(${br},${bg},${bb},${t * 0.34 * cur.alpha})`
            ctx!.beginPath()
            ctx!.moveTo(a.x, a.y)
            ctx!.lineTo(b.x, b.y)
            ctx!.stroke()
          }
        }
      }

      for (let i = 0; i < activeCount; i++) {
        const p = particles[i]
        ctx!.fillStyle = `rgba(${br},${bg},${bb},${0.55 * cur.alpha})`
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fill()
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    function onVisibility() {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!running) {
        running = true
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reducedParticles])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
