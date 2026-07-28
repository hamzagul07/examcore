'use client'

import type { JSX } from 'react'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'

/**
 * The market diagram, for the 9708/2281 lessons mapped to `econ-supply-demand`.
 *
 * Was a single static picture of D, S and an equilibrium dot — which meant the
 * consumer-and-producer-surplus lesson showed no surplus, and the
 * interaction-of-demand-and-supply lesson showed no shift. Both are the thing
 * being examined.
 *
 * Now four scenes selected by `stepIndex`, ordered per slug so each lesson opens
 * on the scene it is actually about. Geometry is computed from the two curve
 * definitions rather than hand-placed, so every intersection, shaded area and
 * dashed guide stays consistent if a curve moves.
 */

const T = DIAGRAM_TEXT
const S = DIAGRAM_STROKE
const DEMAND = '#3f6fb5'
const SUPPLY = '#c2703a'
const SURPLUS_C = '#3f9fb5'
const SURPLUS_P = '#4f9e5f'

/** Plot frame. Origin is the bottom-left corner of the axes. */
const OX = 80
const OY = 320
const RIGHT = 596
const TOP = 62

/** A curve as a straight line through two points — the A-level convention. */
type Line = { x1: number; y1: number; x2: number; y2: number }

const D1: Line = { x1: 110, y1: 90, x2: 560, y2: 300 }
const S1: Line = { x1: 110, y1: 300, x2: 560, y2: 90 }
/** Demand increase: the whole curve shifts right by a fixed quantity. */
const D2: Line = { x1: D1.x1 + 80, y1: D1.y1, x2: D1.x2 + 80, y2: D1.y2 }

const slope = (l: Line) => (l.y2 - l.y1) / (l.x2 - l.x1)
const yAt = (l: Line, x: number) => l.y1 + slope(l) * (x - l.x1)
const xAt = (l: Line, y: number) => l.x1 + (y - l.y1) / slope(l)

function intersect(a: Line, b: Line) {
  const x = (b.y1 - a.y1 + slope(a) * a.x1 - slope(b) * b.x1) / (slope(a) - slope(b))
  return { x, y: yAt(a, x) }
}

/**
 * Trims a line to the plot box. A shifted curve runs past the Q axis otherwise,
 * taking its label off-canvas with it.
 */
function clip(l: Line): Line {
  const lo = Math.max(OX, Math.min(l.x1, l.x2))
  const hi = Math.min(RIGHT, Math.max(l.x1, l.x2))
  const ascending = l.x1 <= l.x2
  const [xa, xb] = ascending ? [lo, hi] : [hi, lo]
  return { x1: xa, y1: yAt(l, xa), x2: xb, y2: yAt(l, xb) }
}

const E1 = intersect(D1, S1)
const E2 = intersect(D2, S1)

/** Prices used to show disequilibrium, one above and one below P*. */
const P_HIGH = E1.y - 56
const P_LOW = E1.y + 56

function Axes() {
  return (
    <g>
      <line x1={OX} y1={OY} x2={RIGHT} y2={OY} stroke={S} strokeWidth="1.6" />
      <line x1={OX} y1={OY} x2={OX} y2={TOP} stroke={S} strokeWidth="1.6" />
      <text x={OX - 24} y={TOP + 4} fontSize="13" fill={T} fontWeight="700">
        P
      </text>
      <text x={RIGHT + 6} y={OY + 6} fontSize="13" fill={T} fontWeight="700">
        Q
      </text>
      <text x={OX - 14} y={OY + 18} fontSize="11" fill={T} opacity="0.7">
        0
      </text>
    </g>
  )
}

function Curve({
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
  // Label just past the end, pulled inside when the curve reaches the Q axis.
  const atEdge = c.x2 >= RIGHT - 1
  const lx = atEdge ? c.x2 - 8 : c.x2 + 6
  const ly = atEdge ? c.y2 - 10 : c.y2 + 4
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
        x={lx}
        y={ly}
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

/** Dashed guides from a point to both axes, with the axis labels. */
function Equilibrium({ x, y, pLabel, qLabel }: { x: number; y: number; pLabel: string; qLabel: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={OY} stroke={T} strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
      <line x1={x} y1={y} x2={OX} y2={y} stroke={T} strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
      <circle cx={x} cy={y} r="5" fill={S} />
      <text x={OX - 32} y={y + 4} fontSize="11.5" fill={T} fontWeight="600">
        {pLabel}
      </text>
      <text x={x - 9} y={OY + 18} fontSize="11.5" fill={T} fontWeight="600">
        {qLabel}
      </text>
    </g>
  )
}

/* ── Scenes ────────────────────────────────────────────────────────────── */

function SceneEquilibrium() {
  return (
    <g>
      <Axes />
      <Curve line={D1} colour={DEMAND} label="D" />
      <Curve line={S1} colour={SUPPLY} label="S" />
      <Equilibrium x={E1.x} y={E1.y} pLabel="P*" qLabel="Q*" />
      <text x={330} y={TOP - 12} fontSize="12" fill={T} textAnchor="middle">
        At P* the plans of buyers and sellers match: Qd = Qs
      </text>
      <text x={330} y={368} fontSize="11" fill={T} textAnchor="middle" opacity="0.85">
        Nothing pushes price away from here — that is what makes it an equilibrium.
      </text>
    </g>
  )
}

function SceneDisequilibrium() {
  const qdHigh = xAt(D1, P_HIGH)
  const qsHigh = xAt(S1, P_HIGH)
  const qdLow = xAt(D1, P_LOW)
  const qsLow = xAt(S1, P_LOW)
  return (
    <g>
      <Axes />
      <Curve line={D1} colour={DEMAND} label="D" />
      <Curve line={S1} colour={SUPPLY} label="S" />
      <circle cx={E1.x} cy={E1.y} r="4" fill={S} opacity="0.5" />

      {/* above equilibrium — excess supply */}
      <line x1={OX} y1={P_HIGH} x2={qsHigh} y2={P_HIGH} stroke={T} strokeWidth="1.3" strokeDasharray="4 3" opacity="0.75" />
      <line x1={qdHigh} y1={P_HIGH} x2={qsHigh} y2={P_HIGH} stroke={SUPPLY} strokeWidth="7" opacity="0.35" className="dgm-hue" />
      <text x={OX - 34} y={P_HIGH + 4} fontSize="11.5" fill={T} fontWeight="600">
        P₁
      </text>
      <text
        x={(qdHigh + qsHigh) / 2}
        y={P_HIGH - 12}
        fontSize="11.5"
        fill={SUPPLY}
        textAnchor="middle"
        fontWeight="700"
        className="dgm-hue"
      >
        surplus (Qs &gt; Qd)
      </text>

      {/* below equilibrium — excess demand */}
      <line x1={OX} y1={P_LOW} x2={qdLow} y2={P_LOW} stroke={T} strokeWidth="1.3" strokeDasharray="4 3" opacity="0.75" />
      <line x1={qsLow} y1={P_LOW} x2={qdLow} y2={P_LOW} stroke={DEMAND} strokeWidth="7" opacity="0.35" className="dgm-hue" />
      <text x={OX - 34} y={P_LOW + 4} fontSize="11.5" fill={T} fontWeight="600">
        P₂
      </text>
      <text
        x={(qsLow + qdLow) / 2}
        y={P_LOW + 22}
        fontSize="11.5"
        fill={DEMAND}
        textAnchor="middle"
        fontWeight="700"
        className="dgm-hue"
      >
        shortage (Qd &gt; Qs)
      </text>

      <text x={330} y={368} fontSize="11" fill={T} textAnchor="middle" opacity="0.85">
        A surplus pushes price down, a shortage pushes it up — both move the market back to P*.
      </text>
    </g>
  )
}

function SceneShift() {
  return (
    <g>
      <Axes />
      <Curve line={S1} colour={SUPPLY} label="S" />
      <Curve line={D1} colour={DEMAND} label="D₁" />
      <Curve line={D2} colour={DEMAND} label="D₂" dashed />
      <Equilibrium x={E1.x} y={E1.y} pLabel="P₁" qLabel="Q₁" />
      <Equilibrium x={E2.x} y={E2.y} pLabel="P₂" qLabel="Q₂" />
      <path
        d={`M ${E1.x + 10} ${E1.y - 6} Q ${(E1.x + E2.x) / 2} ${E1.y - 30} ${E2.x - 8} ${E2.y + 2}`}
        stroke={S}
        strokeWidth="2"
        fill="none"
        markerEnd="url(#econ-arrow)"
      />
      <text x={330} y={TOP - 12} fontSize="12" fill={T} textAnchor="middle">
        Demand rises: the whole curve shifts right
      </text>
      <text x={330} y={368} fontSize="11" fill={T} textAnchor="middle" opacity="0.85">
        A shift moves the curve; a price change only moves you along it. Examiners test that distinction.
      </text>
    </g>
  )
}

function SceneSurplus() {
  const dIntercept = yAt(D1, OX)
  const sIntercept = yAt(S1, OX)
  return (
    <g>
      <Axes />
      <polygon
        points={`${OX},${dIntercept} ${OX},${E1.y} ${E1.x},${E1.y}`}
        fill={SURPLUS_C}
        opacity="0.3"
        className="dgm-hue"
      />
      <polygon
        points={`${OX},${E1.y} ${OX},${sIntercept} ${E1.x},${E1.y}`}
        fill={SURPLUS_P}
        opacity="0.3"
        className="dgm-hue"
      />
      <Curve line={D1} colour={DEMAND} label="D" />
      <Curve line={S1} colour={SUPPLY} label="S" />
      <Equilibrium x={E1.x} y={E1.y} pLabel="P*" qLabel="Q*" />
      <text x={OX + 58} y={E1.y - 34} fontSize="11.5" fill={SURPLUS_C} fontWeight="700" className="dgm-hue">
        consumer surplus
      </text>
      <text x={OX + 58} y={E1.y + 46} fontSize="11.5" fill={SURPLUS_P} fontWeight="700" className="dgm-hue">
        producer surplus
      </text>
      <text x={330} y={368} fontSize="11" fill={T} textAnchor="middle" opacity="0.85">
        What buyers would have paid, less what they did — and what sellers got, less what they&rsquo;d accept.
      </text>
    </g>
  )
}

/* ── Shell ─────────────────────────────────────────────────────────────── */

type Scene = { Scene: () => JSX.Element; title: string; aria: string }

const EQUILIBRIUM: Scene = {
  Scene: SceneEquilibrium,
  title: 'Market equilibrium',
  aria: 'Demand and supply curves crossing at equilibrium price P star and quantity Q star.',
}
const DISEQUILIBRIUM: Scene = {
  Scene: SceneDisequilibrium,
  title: 'Surplus and shortage',
  aria: 'A price above equilibrium creating excess supply, and a price below it creating excess demand.',
}
const SHIFT: Scene = {
  Scene: SceneShift,
  title: 'A shift in demand',
  aria: 'Demand shifting right from D one to D two, raising both equilibrium price and quantity.',
}
const SURPLUS: Scene = {
  Scene: SceneSurplus,
  title: 'Consumer and producer surplus',
  aria: 'Consumer surplus shaded between the demand curve and the equilibrium price, producer surplus between that price and the supply curve.',
}

/**
 * Scene order per lesson, so each opens on what it is actually about. Students
 * can still step through the rest, which is why this stays one component.
 */
function scenesForSlug(slug: string): Scene[] {
  if (slug.includes('consumer-and-producer-surplus')) {
    return [SURPLUS, EQUILIBRIUM, DISEQUILIBRIUM, SHIFT]
  }
  if (slug.includes('interaction-of-demand-and-supply')) {
    return [SHIFT, DISEQUILIBRIUM, EQUILIBRIUM, SURPLUS]
  }
  return [EQUILIBRIUM, DISEQUILIBRIUM, SHIFT, SURPLUS]
}

export function EconSupplyDemandDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '2-1-demand-and-supply-curves',
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
      <defs>
        <marker
          id="econ-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={S} />
        </marker>
      </defs>
      <text x="20" y="30" fontSize="14" fill={T} fontWeight="700">
        {title}
      </text>
      <Scene />
    </svg>
  )
}
