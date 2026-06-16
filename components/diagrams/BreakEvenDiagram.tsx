'use client'

import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { DiagramGrid } from '@/components/diagrams/diagram-chrome'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '5-4-4-break-even-analysis'

const AXIS = { x0: 52, y0: 188, x1: 392, y1: 28 }

function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return `$${Math.round(n)}`
}

/** CVP / break-even chart — interactive TR, TC, FC with live BE and margin of safety. */
export function BreakEvenDiagram({
  className = '',
  stepIndex = 0,
  params,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const beRef = useRef<SVGCircleElement>(null)

  const fc = params?.fc ?? 12_000
  const sp = params?.sp ?? 48
  const vc = params?.vc ?? 18
  const actual = params?.actual ?? 450
  const contribution = Math.max(sp - vc, 0.01)
  const beUnits = contribution > 0 ? fc / contribution : 0
  const mosUnits = Math.max(0, actual - beUnits)
  const mosPct = actual > 0 ? (mosUnits / actual) * 100 : 0

  const geom = useMemo(() => {
    const maxQ = Math.max(beUnits * 1.55, actual * 1.12, 520)
    const trAtMax = sp * maxQ
    const tcAtMax = fc + vc * maxQ
    const maxVal = Math.max(trAtMax, tcAtMax, fc) * 1.08
    const { x0, y0, x1, y1 } = AXIS
    const xOf = (q: number) => x0 + (q / maxQ) * (x1 - x0)
    const yOf = (v: number) => y0 - (v / maxVal) * (y0 - y1)
    const beX = xOf(beUnits)
    const beY = yOf(sp * beUnits)
    const actX = xOf(actual)
    const fcY = yOf(fc)
    const trEnd = { x: x1, y: yOf(trAtMax) }
    const tcEnd = { x: x1, y: yOf(tcAtMax) }
    return { maxQ, maxVal, xOf, yOf, beX, beY, actX, fcY, trEnd, tcEnd }
  }, [actual, beUnits, fc, sp, vc])

  useEffect(() => {
    const dot = beRef.current
    if (!dot || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(dot, { attr: { r: 4 } }, { attr: { r: 7 }, duration: 0.35, yoyo: true, repeat: 1, ease: 'power2.out' })
  }, [stepIndex, geom.beX, geom.beY])

  const profitFill =
    contribution <= 0
      ? 'none'
      : `M ${geom.beX} ${geom.beY} L ${geom.actX} ${geom.beY} L ${geom.actX} ${AXIS.y0} L ${geom.beX} ${AXIS.y0} Z`

  return (
    <svg
      viewBox="0 0 420 240"
      className={`lesson-diagram-svg lesson-diagram-svg--breakeven ${className}`.trim()}
      role="img"
      aria-label={`Break-even chart: ${Math.round(beUnits)} units, margin of safety ${Math.round(mosUnits)} units`}
    >
      <DiagramGrid {...AXIS} xLabel="Output (units)" yLabel="£" columns={8} rows={5} />

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line
          x1={AXIS.x0}
          y1={geom.fcY}
          x2={AXIS.x1}
          y2={geom.fcY}
          stroke={DIAGRAM_STROKE}
          strokeWidth="2"
          strokeDasharray="7 5"
        />
        <text x={AXIS.x0 + 6} y={geom.fcY - 6} fontSize="9" fill={DIAGRAM_TEXT}>
          Fixed costs {fmtMoney(fc)}
        </text>
        <rect x={286} y={34} width={118} height={52} rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.95" />
        <text x={345} y={52} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT} fontWeight="600">
          Contribution / unit
        </text>
        <text x={345} y={68} textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          {fmtMoney(contribution)}
        </text>
        <text x={345} y={80} textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
          = {fmtMoney(sp)} − {fmtMoney(vc)}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <line
          x1={AXIS.x0}
          y1={geom.fcY}
          x2={geom.tcEnd.x}
          y2={geom.tcEnd.y}
          stroke={DIAGRAM_STROKE}
          strokeWidth="2.25"
        />
        <text x={geom.tcEnd.x - 68} y={geom.tcEnd.y - 4} fontSize="9" fill={DIAGRAM_TEXT}>
          Total cost
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <line
          x1={AXIS.x0}
          y1={AXIS.y0}
          x2={geom.trEnd.x}
          y2={geom.trEnd.y}
          stroke="var(--course-subject-accent, var(--ec-brand))"
          strokeWidth="2.25"
        />
        <text x={geom.trEnd.x - 72} y={geom.trEnd.y + 12} fontSize="9" fill={DIAGRAM_TEXT}>
          Total revenue
        </text>
        <circle ref={beRef} cx={geom.beX} cy={geom.beY} r="6" fill="var(--ink, var(--ec-brand))" />
        <line
          x1={geom.beX}
          y1={geom.beY}
          x2={geom.beX}
          y2={AXIS.y0}
          stroke={DIAGRAM_STROKE}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <text x={geom.beX + 8} y={geom.beY - 8} fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          BE {Math.round(beUnits)} u
        </text>
        <text x={geom.beX - 4} y={AXIS.y0 + 14} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          {Math.round(beUnits)}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        {contribution > 0 && actual > beUnits ? (
          <path d={profitFill} fill="var(--course-subject-accent, var(--ec-brand))" opacity="0.14" />
        ) : null}
        {contribution > 0 && actual > beUnits ? (
          <>
            <line
              x1={geom.beX}
              y1={geom.beY - 2}
              x2={geom.actX}
              y2={geom.beY - 2}
              stroke={DIAGRAM_STROKE}
              strokeWidth="1.5"
            />
            <text x={(geom.beX + geom.actX) / 2} y={geom.beY - 10} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
              Margin of safety
            </text>
          </>
        ) : null}
        <line
          x1={geom.actX}
          y1={AXIS.y0}
          x2={geom.actX}
          y2={geom.beY}
          stroke={DIAGRAM_STROKE}
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <text x={geom.actX} y={AXIS.y0 + 14} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          {Math.round(actual)}
        </text>
        <rect x={12} y={196} width={188} height={36} rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1" opacity="0.95" />
        <text x={20} y={210} fontSize="8" fill={DIAGRAM_TEXT}>
          MoS: {Math.round(mosUnits)} units ({mosPct.toFixed(1)}%)
        </text>
        <text x={20} y={224} fontSize="7" fill={DIAGRAM_TEXT}>
          BE = {fmtMoney(fc)} ÷ {fmtMoney(contribution)} = {Math.round(beUnits)} units
        </text>
      </g>
    </svg>
  )
}
