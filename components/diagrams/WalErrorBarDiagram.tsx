'use client'

import { useEffect, useState } from 'react'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import {
  getLessonDiagramSpec,
  layerOpacity,
  layerOpacityAny,
  stepStateFor,
} from '@/lib/courses/diagram-specs'

type Stage = 'points' | 'lobf' | 'wal' | 'both'

const DEFAULT_SLUG = 'paper-5-planning-and-analysis'
const STAGE_MS = 4500

function stageFromStep(stepIndex?: number): Stage | null {
  if (stepIndex == null) return null
  if (stepIndex <= 0) return 'points'
  if (stepIndex === 1) return 'lobf'
  if (stepIndex === 2) return 'wal'
  return 'both'
}

/** Paper 5 graph: line of best fit vs worst acceptable line through error bars. */
export function WalErrorBarDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const specDriven = (spec?.steps.length ?? 0) > 0
  const controlled = specDriven
  const [autoStage, setAutoStage] = useState<Stage>('lobf')
  const legacyStage = stageFromStep(stepIndex) ?? autoStage

  useEffect(() => {
    if (controlled) return
    const id = window.setInterval(() => {
      setAutoStage((s) => (s === 'lobf' ? 'wal' : 'lobf'))
    }, STAGE_MS)
    return () => window.clearInterval(id)
  }, [controlled])

  const pointsOpacity = specDriven
    ? layerOpacityAny(spec, stepIndex, ['points', 'lobf', 'wal', 'gradient'])
    : 1
  const lobfOpacity = specDriven
    ? layerOpacityAny(spec, stepIndex, ['lobf', 'gradient'], 1, 0)
    : legacyStage === 'lobf' || legacyStage === 'both'
      ? 1
      : 0
  const walOpacity = specDriven
    ? layerOpacityAny(spec, stepIndex, ['wal', 'gradient'], 1, 0)
    : legacyStage === 'wal' || legacyStage === 'both'
      ? 1
      : 0
  const gradientOpacity = specDriven
    ? layerOpacity(spec, stepIndex, 'gradient', 1, 0)
    : legacyStage === 'both'
      ? 1
      : 0

  const stepCaption = stepStateFor(spec, stepIndex)?.caption
  const headline =
    stepCaption ??
    (legacyStage === 'points'
      ? 'Plot points with vertical error bars'
      : legacyStage === 'lobf'
        ? 'LOBF — balanced scatter above and below'
        : legacyStage === 'wal'
          ? 'WAL — steepest/shallowest line through all error bars'
          : 'Compare gradients — Δm = |m_LOBF − m_WAL|')

  const points = [
    { x: 80, y: 155, err: 12 },
    { x: 130, y: 130, err: 10 },
    { x: 180, y: 108, err: 11 },
    { x: 240, y: 82, err: 10 },
    { x: 300, y: 58, err: 12 },
    { x: 350, y: 42, err: 10 },
  ]

  return (
    <div className={`wal-error-bar-diagram equilibrium-forces-diagram ${className}`.trim()}>
      {!controlled ? (
        <div className="equilibrium-forces-diagram-tabs" role="tablist" aria-label="Graph analysis view">
          <button
            type="button"
            role="tab"
            aria-selected={legacyStage === 'lobf'}
            className={legacyStage === 'lobf' ? 'is-active' : ''}
            onClick={() => setAutoStage('lobf')}
          >
            Line of best fit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={legacyStage === 'wal'}
            className={legacyStage === 'wal' ? 'is-active' : ''}
            onClick={() => setAutoStage('wal')}
          >
            Worst acceptable line
          </button>
        </div>
      ) : null}

      <svg
        viewBox="0 0 420 240"
        className="lesson-diagram-svg wal-error-bar-diagram-svg"
        role="img"
        aria-label="Graph with error bars, line of best fit, and worst acceptable line for gradient uncertainty"
      >
        <line x1="50" y1="180" x2="380" y2="180" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="50" y1="180" x2="50" y2="30" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="385" y="185" fontSize="11" fill={DIAGRAM_TEXT}>
          x
        </text>
        <text x="38" y="35" fontSize="11" fill={DIAGRAM_TEXT}>
          y
        </text>

        <g opacity={pointsOpacity}>
          {points.map((p, i) => (
            <g key={i}>
              <line
                x1={p.x}
                y1={p.y - p.err}
                x2={p.x}
                y2={p.y + p.err}
                stroke={DIAGRAM_TEXT}
                strokeWidth="2"
                opacity="0.7"
              />
              <line x1={p.x - 5} y1={p.y - p.err} x2={p.x + 5} y2={p.y - p.err} stroke={DIAGRAM_TEXT} strokeWidth="1.5" />
              <line x1={p.x - 5} y1={p.y + p.err} x2={p.x + 5} y2={p.y + p.err} stroke={DIAGRAM_TEXT} strokeWidth="1.5" />
              <circle cx={p.x} cy={p.y} r="4" fill={DIAGRAM_STROKE} />
            </g>
          ))}
        </g>

        {lobfOpacity > 0 ? (
          <line
            x1="65"
            y1="168"
            x2="365"
            y2="38"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            className="eq-anim-vec-a"
            opacity={lobfOpacity}
          />
        ) : null}

        {walOpacity > 0 ? (
          <line
            x1="65"
            y1="148"
            x2="365"
            y2="52"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="eq-anim-vec-b"
            opacity={walOpacity}
          />
        ) : null}

        {gradientOpacity > 0 ? (
          <>
            <polygon
              points="120,145 280,68 280,145"
              fill="none"
              stroke={DIAGRAM_TEXT}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity={gradientOpacity * 0.55}
            />
            <text x="210" y="218" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} opacity={gradientOpacity}>
              Δgradient = |m_LOBF − m_WAL|
            </text>
          </>
        ) : null}

        <text x="210" y="22" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
          {headline}
        </text>
      </svg>
    </div>
  )
}
