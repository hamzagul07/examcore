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
  Point,
  PriceLine,
  Region,
  SUPPLY,
  SceneTitle,
  T,
  VIEWBOX,
  intersect,
  shift,
  xAt,
  yAt,
  type Line,
} from '@/components/diagrams/econ-plot'

/**
 * Government intervention, for the nine 9708/2281 lessons on `econ-intervention`
 * — reasons to intervene, methods, market failure, externalities, indirect taxes
 * and subsidies, and redistribution.
 *
 * Was 39 lines showing only an indirect tax. Four of those nine lessons are about
 * externalities or price controls, which the old diagram could not show at all.
 */

const D: Line = { x1: 110, y1: 90, x2: 560, y2: 300 }
const S: Line = { x1: 110, y1: 300, x2: 560, y2: 90 }
const WEDGE = 50

const E = intersect(D, S)
/** A tax raises the price sellers need at every quantity, so S shifts up. */
const S_TAX = shift(S, 0, -WEDGE)
const E_TAX = intersect(D, S_TAX)
/** A subsidy lowers it, so S shifts down. */
const S_SUB = shift(S, 0, WEDGE)
const E_SUB = intersect(D, S_SUB)
/** Marginal social cost sits above marginal private cost by the external cost. */
const MSC = shift(S, 0, -45)
const E_SOCIAL = intersect(D, MSC)

const P_CEILING = E.y + 45

function SceneTax(): JSX.Element {
  const received = yAt(S, E_TAX.x)
  return (
    <g>
      <Region
        points={[
          { x: E_TAX.x, y: E_TAX.y },
          { x: E_TAX.x, y: received },
          { x: 80, y: received },
          { x: 80, y: E_TAX.y },
        ]}
        colour={LOSS}
      />
      <Axes />
      <Curve line={D} colour={DEMAND} label="D" />
      <Curve line={S} colour={SUPPLY} label="S" />
      <Curve line={S_TAX} colour={SUPPLY} label="S+tax" dashed />
      <Point p={E} muted />
      <Point p={E_TAX} pLabel="Pc" qLabel="Q₂" />
      <text x={110} y={received - 6} fontSize="10.5" fill={LOSS} fontWeight="700" className="dgm-hue">
        tax revenue
      </text>
      <line x1={80} y1={received} x2={E_TAX.x} y2={received} stroke={T} strokeWidth="1" strokeDasharray="3 3" opacity="0.55" />
      <text x={50} y={received + 4} fontSize="11.5" fill={T} fontWeight="600">
        Pp
      </text>
      <SceneTitle>Indirect tax</SceneTitle>
      <Caption colour={GAIN}>
        Consumers pay Pc, producers keep Pp — the gap is the tax, and here it splits evenly.
      </Caption>
    </g>
  )
}

function SceneSubsidy(): JSX.Element {
  return (
    <g>
      <Axes />
      <Curve line={D} colour={DEMAND} label="D" />
      <Curve line={S} colour={SUPPLY} label="S" />
      <Curve line={S_SUB} colour={SUPPLY} label="S+subsidy" dashed />
      <Point p={E} pLabel="P₁" qLabel="Q₁" muted />
      <Point p={E_SUB} pLabel="P₂" qLabel="Q₂" />
      <SceneTitle>Subsidy</SceneTitle>
      <Caption colour={GAIN}>
        Supply shifts down: price falls and quantity rises — the mirror image of a tax.
      </Caption>
    </g>
  )
}

function SceneExternality(): JSX.Element {
  const mscAtMarket = yAt(MSC, E.x)
  return (
    <g>
      <Region points={[E_SOCIAL, E, { x: E.x, y: mscAtMarket }]} colour={LOSS} opacity={0.35} />
      <Axes />
      <Curve line={D} colour={DEMAND} label="MSB" />
      <Curve line={S} colour={SUPPLY} label="MPC" />
      <Curve line={MSC} colour={LOSS} label="MSC" dashed />
      <Point p={E} qLabel="Q market" muted />
      <Point p={E_SOCIAL} qLabel="Q social" />
      <text x={E.x + 12} y={mscAtMarket + 4} fontSize="10.5" fill={LOSS} fontWeight="700" className="dgm-hue">
        welfare loss
      </text>
      <SceneTitle>Negative production externality</SceneTitle>
      <Caption colour={LOSS}>
        The market ignores the external cost, so it over-produces — the shaded triangle is the welfare loss.
      </Caption>
    </g>
  )
}

function SceneMaxPrice(): JSX.Element {
  const qd = xAt(D, P_CEILING)
  const qs = xAt(S, P_CEILING)
  return (
    <g>
      <Axes />
      <Curve line={D} colour={DEMAND} label="D" />
      <Curve line={S} colour={SUPPLY} label="S" />
      <Point p={E} pLabel="P*" muted />
      <PriceLine y={P_CEILING} label="P max" colour={LOSS} to={qd} />
      <line x1={qs} y1={P_CEILING} x2={qd} y2={P_CEILING} stroke={DEMAND} strokeWidth="7" opacity="0.35" className="dgm-hue" />
      <text x={(qs + qd) / 2} y={P_CEILING + 22} fontSize="11.5" fill={DEMAND} textAnchor="middle" fontWeight="700" className="dgm-hue">
        shortage
      </text>
      <SceneTitle>Maximum price</SceneTitle>
      <Caption colour={LOSS}>
        A ceiling below P* is binding: quantity demanded exceeds quantity supplied, so the good must be rationed some other way.
      </Caption>
    </g>
  )
}

type Scene = { Scene: () => JSX.Element; aria: string }

const TAX: Scene = { Scene: SceneTax, aria: 'An indirect tax shifting supply up, raising the price consumers pay and lowering what producers keep, with tax revenue shaded.' }
const SUBSIDY: Scene = { Scene: SceneSubsidy, aria: 'A subsidy shifting supply down, lowering price and raising quantity.' }
const EXTERNALITY: Scene = { Scene: SceneExternality, aria: 'Marginal social cost above marginal private cost, with the welfare loss triangle from over-production shaded.' }
const MAX_PRICE: Scene = { Scene: SceneMaxPrice, aria: 'A maximum price below equilibrium creating a shortage between quantity supplied and quantity demanded.' }

function scenesForSlug(slug: string): Scene[] {
  if (slug.includes('externalit') || slug.includes('market-failure') || slug.includes('social-cost')) {
    return [EXTERNALITY, TAX, SUBSIDY, MAX_PRICE]
  }
  if (slug.includes('indirect-taxes') || slug.includes('subsidies')) return [TAX, SUBSIDY, EXTERNALITY, MAX_PRICE]
  if (slug.includes('inequality') || slug.includes('equity') || slug.includes('redistribution')) {
    return [MAX_PRICE, TAX, SUBSIDY, EXTERNALITY]
  }
  return [TAX, SUBSIDY, EXTERNALITY, MAX_PRICE]
}

export function EconInterventionDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '3-2-methods-and-effects-of-government-intervention-in-markets',
}: LessonDiagramComponentProps) {
  const scenes = scenesForSlug(lessonSlug)
  const { Scene, aria } = scenes[Math.min(Math.max(stepIndex, 0), scenes.length - 1)]
  return (
    <svg viewBox={VIEWBOX} className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label={aria}>
      <Scene />
    </svg>
  )
}
