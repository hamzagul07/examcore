'use client'

import type { JSX } from 'react'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'

/**
 * AD–AS, for the seventeen 9708/2281 lessons mapped to `econ-macro` — growth,
 * unemployment, price stability, and fiscal, monetary and supply-side policy.
 *
 * Was one static picture of AD, AS and a dot. That cannot show the thing all
 * those lessons turn on: **the same rise in AD does something different
 * depending on where the economy is on AS.** With spare capacity it buys output
 * almost for free; near full employment it buys mostly inflation. Examiners test
 * exactly that, and a single equilibrium dot cannot express it.
 *
 * AS is a sampled polyline rather than a bezier so equilibria can be solved
 * numerically — every dot, dashed guide and axis label is computed from the
 * curves, not hand-placed.
 */

const T = DIAGRAM_TEXT
const S = DIAGRAM_STROKE
const AD_C = '#3f6fb5'
const AS_C = '#c2703a'
const SHIFT_C = '#4f9e5f'

const OX = 80
const OY = 320
const RIGHT = 596
const TOP = 58

type Pt = { x: number; y: number }
type Line = { x1: number; y1: number; x2: number; y2: number }

/**
 * Keynesian AS: near-flat while spare capacity exists, rising as bottlenecks
 * bite, vertical at full-employment output. Screen coords, so a smaller y is a
 * higher price level.
 */
const AS: Pt[] = [
  { x: 110, y: 294 },
  { x: 200, y: 290 },
  { x: 270, y: 284 },
  { x: 330, y: 270 },
  { x: 380, y: 244 },
  { x: 420, y: 200 },
  { x: 445, y: 155 },
  { x: 460, y: 110 },
  { x: 466, y: 80 },
  { x: 468, y: TOP + 4 },
]
/** Full-employment output — the vertical section of AS. */
const YF = AS[AS.length - 1].x

/** AS shifted right by supply-side improvement. */
const AS2: Pt[] = AS.map((p) => ({ x: p.x + 58, y: p.y }))

const yOn = (l: Line, x: number) => l.y1 + ((l.y2 - l.y1) / (l.x2 - l.x1)) * (x - l.x1)

/** First crossing of a straight AD with a sampled AS, solved segment by segment. */
function cross(ad: Line, curve: Pt[]): Pt {
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i]
    const b = curve[i + 1]
    const d0 = yOn(ad, a.x) - a.y
    const d1 = yOn(ad, b.x) - b.y
    if (d0 === 0) return a
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1)
      return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
    }
  }
  return curve[curve.length - 1]
}

const path = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')

/** AD positioned to meet AS in its flat section — an economy with spare capacity. */
const AD_SLACK: Line = { x1: 110, y1: 250, x2: 400, y2: 330 }
const AD_SLACK2: Line = { x1: 200, y1: 250, x2: 490, y2: 330 }
/** AD positioned to meet AS in its steep section — an economy near capacity. */
const AD_TIGHT: Line = { x1: 110, y1: 120, x2: 560, y2: 310 }
const AD_TIGHT2: Line = { x1: 200, y1: 120, x2: 650, y2: 310 }

function Axes() {
  return (
    <g>
      <line x1={OX} y1={OY} x2={RIGHT} y2={OY} stroke={S} strokeWidth="1.6" />
      <line x1={OX} y1={OY} x2={OX} y2={TOP} stroke={S} strokeWidth="1.6" />
      <text x={OX - 8} y={TOP - 6} fontSize="11.5" fill={T} fontWeight="700" textAnchor="middle">
        Price level
      </text>
      <text x={RIGHT} y={OY + 20} fontSize="11.5" fill={T} fontWeight="700" textAnchor="end">
        Real output (Y)
      </text>
      <text x={OX - 14} y={OY + 18} fontSize="11" fill={T} opacity="0.7">
        0
      </text>
    </g>
  )
}

function AsCurve({ pts, colour, label, dashed }: { pts: Pt[]; colour: string; label: string; dashed?: boolean }) {
  const end = pts[pts.length - 1]
  return (
    <g>
      <path
        d={path(pts)}
        fill="none"
        stroke={colour}
        strokeWidth="2.6"
        strokeDasharray={dashed ? '6 4' : undefined}
        className="dgm-hue"
      />
      <text x={end.x + 6} y={end.y + 10} fontSize="13" fill={colour} fontWeight="700" className="dgm-hue">
        {label}
      </text>
    </g>
  )
}

function AdCurve({ line, label, dashed }: { line: Line; label: string; dashed?: boolean }) {
  const x2 = Math.min(line.x2, RIGHT)
  const y2 = yOn(line, x2)
  const atEdge = x2 >= RIGHT - 1
  return (
    <g>
      <line
        x1={line.x1}
        y1={line.y1}
        x2={x2}
        y2={y2}
        stroke={AD_C}
        strokeWidth="2.6"
        strokeDasharray={dashed ? '6 4' : undefined}
        className="dgm-hue"
      />
      <text
        x={atEdge ? x2 - 6 : x2 + 6}
        y={atEdge ? y2 - 8 : y2 + 4}
        fontSize="13"
        fill={AD_C}
        fontWeight="700"
        textAnchor={atEdge ? 'end' : 'start'}
        className="dgm-hue"
      >
        {label}
      </text>
    </g>
  )
}

function Point({ p, pLabel, yLabel, muted }: { p: Pt; pLabel: string; yLabel: string; muted?: boolean }) {
  return (
    <g opacity={muted ? 0.55 : 1}>
      <line x1={p.x} y1={p.y} x2={p.x} y2={OY} stroke={T} strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
      <line x1={p.x} y1={p.y} x2={OX} y2={p.y} stroke={T} strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
      <circle cx={p.x} cy={p.y} r="5" fill={S} />
      <text x={OX - 30} y={p.y + 4} fontSize="11.5" fill={T} fontWeight="600">
        {pLabel}
      </text>
      <text x={p.x - 10} y={OY + 18} fontSize="11.5" fill={T} fontWeight="600">
        {yLabel}
      </text>
    </g>
  )
}

function FullEmployment() {
  return (
    <g>
      <line x1={YF} y1={OY} x2={YF} y2={TOP + 2} stroke={T} strokeWidth="1.2" strokeDasharray="5 4" opacity="0.45" />
      <text x={YF + 5} y={TOP + 14} fontSize="10.5" fill={T} opacity="0.75">
        Yf
      </text>
    </g>
  )
}

/* ── Scenes ────────────────────────────────────────────────────────────── */

function SceneEquilibrium() {
  const e = cross(AD_TIGHT, AS)
  return (
    <g>
      <Axes />
      <FullEmployment />
      <AsCurve pts={AS} colour={AS_C} label="AS" />
      <AdCurve line={AD_TIGHT} label="AD" />
      <Point p={e} pLabel="P₁" yLabel="Y₁" />
      <text x={150} y={288} fontSize="10.5" fill={AS_C} textAnchor="middle" className="dgm-hue">
        spare capacity
      </text>
      <text x={402} y={232} fontSize="10.5" fill={AS_C} textAnchor="middle" className="dgm-hue">
        bottlenecks
      </text>
      <text x={330} y={362} fontSize="11" fill={T} textAnchor="middle" opacity="0.85">
        AS is flat while resources are idle and steepens as they run out — which is why the same rise in AD does different things.
      </text>
    </g>
  )
}

function SceneSlack() {
  const e1 = cross(AD_SLACK, AS)
  const e2 = cross(AD_SLACK2, AS)
  return (
    <g>
      <Axes />
      <FullEmployment />
      <AsCurve pts={AS} colour={AS_C} label="AS" />
      <AdCurve line={AD_SLACK} label="AD₁" />
      <AdCurve line={AD_SLACK2} label="AD₂" dashed />
      <Point p={e1} pLabel="P₁" yLabel="Y₁" muted />
      <Point p={e2} pLabel="P₂" yLabel="Y₂" />
      <text x={330} y={TOP + 34} fontSize="12" fill={T} textAnchor="middle">
        AD rises with spare capacity
      </text>
      <text x={330} y={362} fontSize="11" fill={SHIFT_C} textAnchor="middle" fontWeight="600" className="dgm-hue">
        Output rises a lot, the price level barely moves — reflation, not inflation.
      </text>
    </g>
  )
}

function SceneTight() {
  const e1 = cross(AD_TIGHT, AS)
  const e2 = cross(AD_TIGHT2, AS)
  return (
    <g>
      <Axes />
      <FullEmployment />
      <AsCurve pts={AS} colour={AS_C} label="AS" />
      <AdCurve line={AD_TIGHT} label="AD₁" />
      <AdCurve line={AD_TIGHT2} label="AD₂" dashed />
      <Point p={e1} pLabel="P₁" yLabel="Y₁" muted />
      <Point p={e2} pLabel="P₂" yLabel="Y₂" />
      <text x={330} y={TOP + 34} fontSize="12" fill={T} textAnchor="middle">
        The same rise in AD, near full employment
      </text>
      <text x={330} y={362} fontSize="11" fill={SHIFT_C} textAnchor="middle" fontWeight="600" className="dgm-hue">
        Now it is mostly price level — demand-pull inflation, with little extra output.
      </text>
    </g>
  )
}

function SceneSupplySide() {
  const e1 = cross(AD_TIGHT, AS)
  const e2 = cross(AD_TIGHT, AS2)
  return (
    <g>
      <Axes />
      <AsCurve pts={AS} colour={AS_C} label="AS₁" />
      <AsCurve pts={AS2} colour={AS_C} label="AS₂" dashed />
      <AdCurve line={AD_TIGHT} label="AD" />
      <Point p={e1} pLabel="P₁" yLabel="Y₁" muted />
      <Point p={e2} pLabel="P₂" yLabel="Y₂" />
      <text x={330} y={TOP + 34} fontSize="12" fill={T} textAnchor="middle">
        Supply-side policy shifts AS right
      </text>
      <text x={330} y={362} fontSize="11" fill={SHIFT_C} textAnchor="middle" fontWeight="600" className="dgm-hue">
        Higher output and a lower price level — the one shift that improves both at once.
      </text>
    </g>
  )
}

/* ── Shell ─────────────────────────────────────────────────────────────── */

type Scene = { Scene: () => JSX.Element; title: string; aria: string }

const EQUILIBRIUM: Scene = {
  Scene: SceneEquilibrium,
  title: 'AD–AS equilibrium',
  aria: 'Aggregate demand crossing a Keynesian aggregate supply curve, which is flat with spare capacity and vertical at full-employment output.',
}
const SLACK: Scene = {
  Scene: SceneSlack,
  title: 'AD rises with spare capacity',
  aria: 'Aggregate demand shifting right along the flat section of AS, raising real output with almost no change in the price level.',
}
const TIGHT: Scene = {
  Scene: SceneTight,
  title: 'AD rises near full employment',
  aria: 'Aggregate demand shifting right along the steep section of AS, raising the price level with little extra real output.',
}
const SUPPLY_SIDE: Scene = {
  Scene: SceneSupplySide,
  title: 'Supply-side policy',
  aria: 'Aggregate supply shifting right, raising real output and lowering the price level at the same aggregate demand.',
}

/** Each lesson opens on the scene it is examined on. */
function scenesForSlug(slug: string): Scene[] {
  if (slug.includes('supply-side')) return [SUPPLY_SIDE, EQUILIBRIUM, SLACK, TIGHT]
  if (slug.includes('price-stability') || slug.includes('inflation')) {
    return [TIGHT, EQUILIBRIUM, SLACK, SUPPLY_SIDE]
  }
  if (slug.includes('unemployment') || slug.includes('employment')) {
    return [SLACK, EQUILIBRIUM, TIGHT, SUPPLY_SIDE]
  }
  if (slug.includes('fiscal-policy') || slug.includes('monetary-policy') || slug.includes('demand-side')) {
    return [SLACK, TIGHT, EQUILIBRIUM, SUPPLY_SIDE]
  }
  if (slug.includes('economic-growth')) return [SLACK, SUPPLY_SIDE, EQUILIBRIUM, TIGHT]
  return [EQUILIBRIUM, SLACK, TIGHT, SUPPLY_SIDE]
}

export function EconMacroDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '4-3-aggregate-demand-and-aggregate-supply-analysis',
}: LessonDiagramComponentProps) {
  const scenes = scenesForSlug(lessonSlug)
  const { Scene, title, aria } = scenes[Math.min(Math.max(stepIndex, 0), scenes.length - 1)]

  return (
    <svg
      viewBox="0 0 640 390"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label={aria}
    >
      <text x="20" y="28" fontSize="14" fill={T} fontWeight="700">
        {title}
      </text>
      <Scene />
    </svg>
  )
}
