import type { FlowFieldParams } from './data-mapper'
import { SimplexNoise } from './simplex-noise'
import { inkColor, paperColor } from './subject-palette'

export type ArtRenderOptions = {
  width: number
  height: number
  subjectCode: string
  zenMode?: boolean
  steps?: number
}

function regionSatMult(x: number, params: FlowFieldParams): number {
  if (x > 0.65) return params.presentEdgeSatMult
  if (x < 0.35) return params.pastEdgeSatMult
  return 1
}

/** Bake flow-field ink trails to a canvas; returns data URL. */
export function renderFlowFieldArt(
  params: FlowFieldParams,
  opts: ArtRenderOptions
): string {
  const { width, height, subjectCode, zenMode = false } = opts
  const steps = opts.steps ?? 2800
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = paperColor(zenMode)
  ctx.fillRect(0, 0, width, height)

  const noise = new SimplexNoise(params.seed)
  const scale = 0.004

  if (params.previewOnly) {
    ctx.strokeStyle = zenMode ? 'rgba(90,154,106,0.08)' : 'rgba(148,163,184,0.12)'
    ctx.lineWidth = 1
    for (let y = 0; y < height; y += 24) {
      for (let x = 0; x < width; x += 24) {
        const angle = noise.noise2D(x * scale, y * scale) * Math.PI * 2
        const len = 10
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
        ctx.stroke()
      }
    }
    return canvas.toDataURL('image/jpeg', 0.88)
  }

  ctx.globalCompositeOperation = 'source-over'

  for (const p of params.particles) {
    let x = p.startX * width
    let y = p.startY * height
    const trailLen = Math.floor(40 + p.recencyWeight * 80)
    ctx.lineWidth = 0.6 + p.recencyWeight * 1.4
    ctx.lineCap = 'round'

    for (let i = 0; i < trailLen; i++) {
      const nx = noise.noise2D(x * scale, y * scale) * Math.PI * 2
      let angle = nx + p.hourBias + (p.ageIndex / Math.max(1, params.particles.length)) * 0.4

      for (const att of params.attractors) {
        const ax = att.x * width
        const ay = att.y * height
        const dx = ax - x
        const dy = ay - y
        const dist = Math.sqrt(dx * dx + dy * dy) + 1
        if (dist < width * 0.25) {
          angle += Math.atan2(dy, dx) * att.strength * 0.15
        }
      }

      const nx2 = x + Math.cos(angle) * (1.2 + p.recencyWeight * 0.8)
      const ny2 = y + Math.sin(angle) * (1.2 + p.recencyWeight * 0.8)
      const sat = regionSatMult(x / width, params)
      ctx.strokeStyle = inkColor(
        subjectCode,
        p.scorePct,
        p.recencyWeight,
        sat,
        zenMode
      )
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(nx2, ny2)
      ctx.stroke()
      x = nx2
      y = ny2
      if (x < 0 || x > width || y < 0 || y > height) break
    }
  }

  void steps
  return canvas.toDataURL('image/jpeg', 0.88)
}
