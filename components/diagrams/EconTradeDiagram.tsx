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
  NEUTRAL,
  Point,
  PriceLine,
  Region,
  SUPPLY,
  SceneTitle,
  VIEWBOX,
  intersect,
  shift,
  xAt,
  type Line,
} from '@/components/diagrams/econ-plot'

/**
 * International trade, for the twelve lessons on `econ-trade` — reasons to trade,
 * protectionism, the current account, exchange rates and globalisation.
 *
 * Was 40 lines showing a tariff only. Three of the twelve lessons are about
 * exchange rates, which needs a different market entirely (the currency itself),
 * so that is now its own scene rather than absent.
 */

const D: Line = { x1: 110, y1: 90, x2: 560, y2: 300 }
const S: Line = { x1: 110, y1: 300, x2: 560, y2: 90 }
const E = intersect(D, S)

/** World price sits below the closed-economy equilibrium, so the country imports. */
const PW = 240
const TARIFF = 25
const PW_T = PW - TARIFF

const qsFree = xAt(S, PW)
const qdFree = xAt(D, PW)
const qsTariff = xAt(S, PW_T)
const qdTariff = xAt(D, PW_T)

/** The currency market: price of the currency against quantity traded. */
const D_CUR: Line = { x1: 110, y1: 90, x2: 560, y2: 300 }
const S_CUR: Line = { x1: 110, y1: 300, x2: 560, y2: 90 }
const D_CUR2 = shift(D_CUR, -80)
const E_CUR = intersect(D_CUR, S_CUR)
const E_CUR2 = intersect(D_CUR2, S_CUR)

function ImportBand({ from, to, y, label, colour }: { from: number; to: number; y: number; label: string; colour: string }) {
  return (
    <g>
      <line x1={from} y1={y} x2={to} y2={y} stroke={colour} strokeWidth="7" opacity="0.35" className="dgm-hue" />
      <text x={(from + to) / 2} y={y + 22} fontSize="11.5" fill={colour} textAnchor="middle" fontWeight="700" className="dgm-hue">
        {label}
      </text>
    </g>
  )
}

function SceneFreeTrade(): JSX.Element {
  return (
    <g>
      <Axes />
      <Curve line={D} colour={DEMAND} label="D domestic" />
      <Curve line={S} colour={SUPPLY} label="S domestic" />
      <Point p={E} pLabel="P*" muted />
      <PriceLine y={PW} label="Pw" colour={NEUTRAL} />
      <ImportBand from={qsFree} to={qdFree} y={PW} label="imports" colour={NEUTRAL} />
      <SceneTitle>Free trade at the world price</SceneTitle>
      <Caption>
        At Pw domestic firms supply only part of demand. The gap is imports — and consumers pay less than P*.
      </Caption>
    </g>
  )
}

function SceneTariff(): JSX.Element {
  return (
    <g>
      <Region
        points={[
          { x: qsTariff, y: PW_T },
          { x: qdTariff, y: PW_T },
          { x: qdTariff, y: PW },
          { x: qsTariff, y: PW },
        ]}
        colour={GAIN}
        opacity={0.35}
      />
      <Axes />
      <Curve line={D} colour={DEMAND} label="D domestic" />
      <Curve line={S} colour={SUPPLY} label="S domestic" />
      <PriceLine y={PW} label="Pw" colour={NEUTRAL} />
      <PriceLine y={PW_T} label="Pw+t" colour={LOSS} />
      <ImportBand from={qsTariff} to={qdTariff} y={PW_T} label="imports" colour={NEUTRAL} />
      <text x={(qsTariff + qdTariff) / 2} y={PW_T - 10} fontSize="10.5" fill={GAIN} textAnchor="middle" fontWeight="700" className="dgm-hue">
        tariff revenue
      </text>
      <SceneTitle>A tariff</SceneTitle>
      <Caption colour={LOSS}>
        Price rises to Pw+t: domestic output up, imports down, government collects the shaded revenue — and consumers pay more.
      </Caption>
    </g>
  )
}

function SceneExchangeRate(): JSX.Element {
  return (
    <g>
      <Axes pLabel="Exchange rate" qLabel="Quantity of currency" />
      <Curve line={S_CUR} colour={SUPPLY} label="S" />
      <Curve line={D_CUR} colour={DEMAND} label="D₁" />
      <Curve line={D_CUR2} colour={DEMAND} label="D₂" dashed />
      <Point p={E_CUR} pLabel="e₁" qLabel="Q₁" muted />
      <Point p={E_CUR2} pLabel="e₂" qLabel="Q₂" />
      <SceneTitle>Depreciation</SceneTitle>
      <Caption colour={LOSS}>
        Demand for the currency falls, so it buys less foreign currency — exports get cheaper abroad, imports dearer at home.
      </Caption>
    </g>
  )
}

type Scene = { Scene: () => JSX.Element; aria: string }

const FREE_TRADE: Scene = { Scene: SceneFreeTrade, aria: 'A domestic market at the world price, with imports filling the gap between domestic supply and demand.' }
const TARIFF_SCENE: Scene = { Scene: SceneTariff, aria: 'A tariff raising the domestic price above the world price, increasing domestic supply, reducing imports, and generating government revenue.' }
const EXCHANGE: Scene = { Scene: SceneExchangeRate, aria: 'The market for a currency, with demand falling and the exchange rate depreciating.' }

function scenesForSlug(slug: string): Scene[] {
  if (slug.includes('exchange-rate')) return [EXCHANGE, FREE_TRADE, TARIFF_SCENE]
  if (slug.includes('protectionism')) return [TARIFF_SCENE, FREE_TRADE, EXCHANGE]
  if (slug.includes('balance-of-payments') || slug.includes('current-account') || slug.includes('imbalances')) {
    return [EXCHANGE, TARIFF_SCENE, FREE_TRADE]
  }
  return [FREE_TRADE, TARIFF_SCENE, EXCHANGE]
}

export function EconTradeDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '6-2-protectionism',
}: LessonDiagramComponentProps) {
  const scenes = scenesForSlug(lessonSlug)
  const { Scene, aria } = scenes[Math.min(Math.max(stepIndex, 0), scenes.length - 1)]
  return (
    <svg viewBox={VIEWBOX} className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label={aria}>
      <Scene />
    </svg>
  )
}
