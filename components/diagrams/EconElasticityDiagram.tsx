'use client'

import type { JSX } from 'react'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import {
  Axes,
  Caption,
  Curve,
  DEMAND,
  GAIN,
  LOSS,
  OX,
  OY,
  Point,
  Region,
  SUPPLY,
  SceneTitle,
  T,
  VIEWBOX,
  xAt,
  type Line,
} from '@/components/diagrams/econ-plot'

/**
 * Elasticity, for the five lessons on `econ-elasticity` (PED, PES, income
 * elasticity).
 *
 * Was 37 lines: a steep and a flat demand curve through a common point. True but
 * inert — it shows what elasticity *looks like* without showing why anyone cares.
 * The reason is revenue, so the same price rise is now drawn twice, once against
 * each curve, with the revenue rectangles that make the answer visible.
 */

/** Both demand curves pass through the same point so they can be compared fairly. */
const C = { x: 335, y: 195 }
const D_INELASTIC: Line = { x1: 280, y1: 90, x2: 390, y2: 300 }
const D_ELASTIC: Line = { x1: 150, y1: 150, x2: 520, y2: 240 }
const S_INELASTIC: Line = { x1: 290, y1: 300, x2: 390, y2: 90 }
const S_ELASTIC: Line = { x1: 150, y1: 250, x2: 520, y2: 150 }

/** The price rise applied to both curves. Higher price = smaller y. */
const P_HIGH = C.y - 45

/** Revenue rectangle from the origin to a point on a curve. */
const revenueBox = (x: number, y: number) => [
  { x: OX, y },
  { x, y },
  { x, y: OY },
  { x: OX, y: OY },
]
const revenue = (x: number, y: number) => (OY - y) * (x - OX)

function SceneCompare(): JSX.Element {
  return (
    <g>
      <Axes />
      <Curve line={D_INELASTIC} colour={SUPPLY} label="D inelastic" />
      <Curve line={D_ELASTIC} colour={DEMAND} label="D elastic" />
      <Point p={C} pLabel="P" qLabel="Q" />
      <SceneTitle>Elastic and inelastic demand</SceneTitle>
      <Caption>
        Steeper means less responsive: the same price change moves quantity far less. Both drawn through the same point so they compare fairly.
      </Caption>
    </g>
  )
}

function SceneInelasticRevenue(): JSX.Element {
  const q2 = xAt(D_INELASTIC, P_HIGH)
  const before = revenue(C.x, C.y)
  const after = revenue(q2, P_HIGH)
  return (
    <g>
      <Region points={revenueBox(q2, P_HIGH)} colour={GAIN} opacity={0.3} />
      <Axes />
      <Curve line={D_INELASTIC} colour={SUPPLY} label="D inelastic" />
      <Point p={C} pLabel="P₁" qLabel="Q₁" muted />
      <Point p={{ x: q2, y: P_HIGH }} pLabel="P₂" qLabel="Q₂" />
      <SceneTitle>Price rises, demand inelastic</SceneTitle>
      <Caption colour={GAIN}>
        Quantity falls by proportionally less than price rose, so total revenue rises ({Math.round(before / 1000)}k → {Math.round(after / 1000)}k).
      </Caption>
    </g>
  )
}

function SceneElasticRevenue(): JSX.Element {
  const q2 = xAt(D_ELASTIC, P_HIGH)
  const before = revenue(C.x, C.y)
  const after = revenue(q2, P_HIGH)
  return (
    <g>
      <Region points={revenueBox(q2, P_HIGH)} colour={LOSS} opacity={0.3} />
      <Axes />
      <Curve line={D_ELASTIC} colour={DEMAND} label="D elastic" />
      <Point p={C} pLabel="P₁" qLabel="Q₁" muted />
      <Point p={{ x: q2, y: P_HIGH }} pLabel="P₂" qLabel="Q₂" />
      <SceneTitle>The same price rise, demand elastic</SceneTitle>
      <Caption colour={LOSS}>
        Quantity collapses, so total revenue falls ({Math.round(before / 1000)}k → {Math.round(after / 1000)}k) — which is why elasticity decides pricing.
      </Caption>
    </g>
  )
}

function ScenePes(): JSX.Element {
  return (
    <g>
      <Axes />
      <Curve line={S_INELASTIC} colour={SUPPLY} label="S inelastic" />
      <Curve line={S_ELASTIC} colour={DEMAND} label="S elastic" />
      <Point p={C} pLabel="P" qLabel="Q" />
      <text x={330} y={334} fontSize="10.5" fill={T} textAnchor="middle" opacity="0.8">
        Time is the main determinant: the longer producers have, the flatter supply becomes.
      </text>
      <SceneTitle>Price elasticity of supply</SceneTitle>
      <Caption>
        Inelastic supply cannot respond quickly — perishables, or anything needing new capacity.
      </Caption>
    </g>
  )
}

type Scene = { Scene: () => JSX.Element; aria: string }

const COMPARE: Scene = { Scene: SceneCompare, aria: 'A steep inelastic demand curve and a flat elastic demand curve drawn through the same point.' }
const INELASTIC_REV: Scene = { Scene: SceneInelasticRevenue, aria: 'A price rise against inelastic demand, with the larger revenue rectangle shaded.' }
const ELASTIC_REV: Scene = { Scene: SceneElasticRevenue, aria: 'The same price rise against elastic demand, with the smaller revenue rectangle shaded.' }
const PES: Scene = { Scene: ScenePes, aria: 'Inelastic and elastic supply curves through a common point.' }

function scenesForSlug(slug: string): Scene[] {
  if (slug.includes('elasticity-of-supply')) return [PES, COMPARE, INELASTIC_REV, ELASTIC_REV]
  return [COMPARE, INELASTIC_REV, ELASTIC_REV, PES]
}

export function EconElasticityDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand',
}: LessonDiagramComponentProps) {
  const scenes = scenesForSlug(lessonSlug)
  const { Scene, aria } = scenes[Math.min(Math.max(stepIndex, 0), scenes.length - 1)]
  return (
    <svg viewBox={VIEWBOX} className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label={aria}>
      <Scene />
    </svg>
  )
}
