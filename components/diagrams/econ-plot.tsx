'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

/**
 * Shared plot primitives for the economics diagram family.
 *
 * Five components (supply–demand, macro, trade, intervention, elasticity) cover
 * 52 lessons between them and all draw the same furniture: two axes, straight
 * curves, an equilibrium with dashed guides to both axes. Extracted so the
 * geometry is solved in one place — a mis-drawn intersection is the kind of
 * error a student would reasonably trust.
 *
 * Screen coordinates throughout, so a *smaller* y is a *higher* price.
 */

export const T = DIAGRAM_TEXT
export const S = DIAGRAM_STROKE

/** Semantic accents. Anything using these must carry `dgm-hue` — see ec-theme-contrast.css. */
export const DEMAND = '#3f6fb5'
export const SUPPLY = '#c2703a'
export const GAIN = '#4f9e5f'
export const LOSS = '#c2503a'
export const NEUTRAL = '#3f9fb5'

/** Plot frame shared by every scene, so scenes are visually interchangeable. */
export const OX = 80
export const OY = 320
export const RIGHT = 596
export const TOP = 62
export const VIEWBOX = '0 0 640 390'

export type Pt = { x: number; y: number }
export type Line = { x1: number; y1: number; x2: number; y2: number }

export const slope = (l: Line) => (l.y2 - l.y1) / (l.x2 - l.x1)
export const yAt = (l: Line, x: number) => l.y1 + slope(l) * (x - l.x1)
export const xAt = (l: Line, y: number) => l.x1 + (y - l.y1) / slope(l)

export function intersect(a: Line, b: Line): Pt {
  const x = (b.y1 - a.y1 + slope(a) * a.x1 - slope(b) * b.x1) / (slope(a) - slope(b))
  return { x, y: yAt(a, x) }
}

/** Shifts a line by a quantity (dx) and/or a price (dy). */
export function shift(l: Line, dx: number, dy = 0): Line {
  return { x1: l.x1 + dx, y1: l.y1 + dy, x2: l.x2 + dx, y2: l.y2 + dy }
}

/**
 * Trims a line to the plot box on both axes (Liang–Barsky).
 *
 * Both directions matter: a shifted curve runs past the quantity axis and takes
 * its label off-canvas, and a subsidy shifts supply *below* the quantity axis
 * entirely. Clipping only x would leave that drawn outside the plot.
 */
export function clip(l: Line): Line {
  const dx = l.x2 - l.x1
  const dy = l.y2 - l.y1
  let t0 = 0
  let t1 = 1
  const edges: [number, number][] = [
    [-dx, l.x1 - OX],
    [dx, RIGHT - l.x1],
    [-dy, l.y1 - TOP],
    [dy, OY - l.y1],
  ]
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return l // parallel and outside; nothing sensible to clip to
      continue
    }
    const r = q / p
    if (p < 0) t0 = Math.max(t0, r)
    else t1 = Math.min(t1, r)
  }
  if (t0 > t1) return l
  return {
    x1: l.x1 + t0 * dx,
    y1: l.y1 + t0 * dy,
    x2: l.x1 + t1 * dx,
    y2: l.y1 + t1 * dy,
  }
}

export function Axes({ pLabel = 'Price', qLabel = 'Quantity' }: { pLabel?: string; qLabel?: string }) {
  return (
    <g>
      <line x1={OX} y1={OY} x2={RIGHT} y2={OY} stroke={S} strokeWidth="1.6" />
      <line x1={OX} y1={OY} x2={OX} y2={TOP} stroke={S} strokeWidth="1.6" />
      <text x={OX - 6} y={TOP - 8} fontSize="11.5" fill={T} fontWeight="700" textAnchor="middle">
        {pLabel}
      </text>
      <text x={RIGHT} y={OY + 20} fontSize="11.5" fill={T} fontWeight="700" textAnchor="end">
        {qLabel}
      </text>
      <text x={OX - 14} y={OY + 18} fontSize="11" fill={T} opacity="0.7">
        0
      </text>
    </g>
  )
}

export function Curve({
  line,
  colour,
  label,
  dashed,
}: {
  line: Line
  colour: string
  label: string
  dashed?: boolean
}) {
  const c = clip(line)
  const atEdge = c.x2 >= RIGHT - 1
  return (
    <g>
      <line
        x1={c.x1}
        y1={c.y1}
        x2={c.x2}
        y2={c.y2}
        stroke={colour}
        strokeWidth="2.6"
        strokeDasharray={dashed ? '6 4' : undefined}
        className="dgm-hue"
      />
      <text
        x={atEdge ? c.x2 - 6 : c.x2 + 6}
        y={atEdge ? c.y2 - 8 : c.y2 + 4}
        fontSize="13"
        fill={colour}
        fontWeight="700"
        textAnchor={atEdge ? 'end' : 'start'}
        className="dgm-hue"
      >
        {label}
      </text>
    </g>
  )
}

/** An equilibrium (or any point of interest) with dashed guides to both axes. */
export function Point({
  p,
  pLabel,
  qLabel,
  muted,
}: {
  p: Pt
  pLabel?: string
  qLabel?: string
  muted?: boolean
}) {
  return (
    <g opacity={muted ? 0.5 : 1}>
      <line x1={p.x} y1={p.y} x2={p.x} y2={OY} stroke={T} strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
      <line x1={p.x} y1={p.y} x2={OX} y2={p.y} stroke={T} strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
      <circle cx={p.x} cy={p.y} r="5" fill={S} />
      {pLabel ? (
        <text x={OX - 30} y={p.y + 4} fontSize="11.5" fill={T} fontWeight="600">
          {pLabel}
        </text>
      ) : null}
      {qLabel ? (
        <text x={p.x - 10} y={OY + 18} fontSize="11.5" fill={T} fontWeight="600">
          {qLabel}
        </text>
      ) : null}
    </g>
  )
}

/** A horizontal price line across the plot, for world prices and price controls. */
export function PriceLine({
  y,
  label,
  colour = T,
  to = RIGHT,
}: {
  y: number
  label: string
  colour?: string
  to?: number
}) {
  return (
    <g>
      <line x1={OX} y1={y} x2={to} y2={y} stroke={colour} strokeWidth="1.8" strokeDasharray="5 4" className="dgm-hue" />
      <text x={OX - 30} y={y + 4} fontSize="11.5" fill={colour} fontWeight="600" className="dgm-hue">
        {label}
      </text>
    </g>
  )
}

/** Caption under the plot. Kept in one place so every scene sits on the same line. */
export function Caption({ children, colour = T }: { children: React.ReactNode; colour?: string }) {
  return (
    <text
      x={330}
      y={366}
      fontSize="11"
      fill={colour}
      textAnchor="middle"
      opacity={colour === T ? 0.85 : 1}
      fontWeight={colour === T ? undefined : 600}
      className={colour === T ? undefined : 'dgm-hue'}
    >
      {children}
    </text>
  )
}

/** Scene heading, top-left, matching the rest of the family. */
export function SceneTitle({ children }: { children: React.ReactNode }) {
  return (
    <text x="20" y="28" fontSize="14" fill={T} fontWeight="700">
      {children}
    </text>
  )
}

/** A shaded region — tax revenue, welfare loss, surplus. */
export function Region({ points, colour, opacity = 0.28 }: { points: Pt[]; colour: string; opacity?: number }) {
  return (
    <polygon
      points={points.map((p) => `${p.x},${p.y}`).join(' ')}
      fill={colour}
      opacity={opacity}
      className="dgm-hue"
    />
  )
}
