'use client'

import { useMemo } from 'react'
import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-6-2-calculation-and-evaluation-of-ratios'

function bar(x: number, h: number, label: string, value: string) {
  const height = Math.max(4, Math.min(90, h))
  return (
    <g>
      <rect x={x} y={170 - height} width={36} height={height} rx="3" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
      <text x={x + 18} y={184} textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
        {label}
      </text>
      <text x={x + 18} y={170 - height - 4} textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT} fontWeight="600">
        {value}
      </text>
    </g>
  )
}

/** Profitability, liquidity, efficiency, and gearing ratio summary chart. */
export function RatioAnalysisDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)

  const revenue = params?.revenue ?? 500_000
  const grossProfit = params?.grossProfit ?? 150_000
  const netProfit = params?.netProfit ?? 40_000
  const pbit = params?.pbit ?? 55_000
  const currentAssets = params?.currentAssets ?? 90_000
  const inventory = params?.inventory ?? 30_000
  const currentLiabilities = params?.currentLiabilities ?? 60_000
  const capitalEmployed = params?.capitalEmployed ?? 400_000
  const nonCurrentLiabilities = params?.nonCurrentLiabilities ?? 120_000

  const ratios = useMemo(() => {
    const gpMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    const npMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0
    const roce = capitalEmployed > 0 ? (pbit / capitalEmployed) * 100 : 0
    const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0
    const acidTest =
      currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0
    const gearing =
      capitalEmployed > 0 ? (nonCurrentLiabilities / capitalEmployed) * 100 : 0
    return { gpMargin, npMargin, roce, currentRatio, acidTest, gearing }
  }, [
    capitalEmployed,
    currentAssets,
    currentLiabilities,
    grossProfit,
    inventory,
    netProfit,
    nonCurrentLiabilities,
    pbit,
    revenue,
  ])

  const scale = (pct: number) => (pct / 100) * 80

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Financial ratio analysis diagram"
    >
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="120" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Liquidity
        </text>
        {bar(72, scale(ratios.currentRatio * 50), 'CR', ratios.currentRatio.toFixed(2))}
        {bar(120, scale(ratios.acidTest * 50), 'AT', ratios.acidTest.toFixed(2))}
        <text x="120" y="52" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Current · Acid test
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="300" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Profitability
        </text>
        {bar(252, scale(ratios.gpMargin), 'GP%', `${ratios.gpMargin.toFixed(1)}%`)}
        {bar(300, scale(ratios.npMargin), 'NP%', `${ratios.npMargin.toFixed(1)}%`)}
        {bar(348, scale(ratios.roce), 'ROCE', `${ratios.roce.toFixed(1)}%`)}
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="108" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Gearing
        </text>
        {bar(186, scale(ratios.gearing), 'G%', `${ratios.gearing.toFixed(1)}%`)}
        <text x="210" y="140" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          NCL ÷ capital employed × 100
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="172" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Interpretation
        </text>
        <text x="210" y="192" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Compare trends · benchmark · link ratio to stakeholder decision
        </text>
      </g>
    </svg>
  )
}
