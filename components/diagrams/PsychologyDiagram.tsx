'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

function clinicalView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const steps = ['Diagnosis', 'Explanation', 'Treatment', 'Evaluation']
  return (
    <>
      {steps.map((label, i) => (
        <g key={label} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={36 + i * 92} y="72" width="80" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={76 + i * 92} y="96" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
            {label}
          </text>
          {i < steps.length - 1 ? (
            <path d={`M ${116 + i * 92} 92 L ${128 + i * 92} 92`} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          ) : null}
        </g>
      ))}
      <text x="210" y="48" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        Clinical psychology pathway
      </text>
    </>
  )
}

function consumerView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <text x="210" y="40" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
          Stimulus → perception
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="160" y="56" width="100" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="78" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Decision heuristics
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <rect x="160" y="108" width="100" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="130" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Purchase behaviour
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="168" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Atmospherics · branding · post-purchase evaluation
        </text>
      </g>
    </>
  )
}

function healthView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const nodes = [
    { x: 210, y: 52, label: 'Perceived\nseverity' },
    { x: 96, y: 132, label: 'Perceived\nsusceptibility' },
    { x: 324, y: 132, label: 'Cues to\naction' },
  ]
  return (
    <>
      {nodes.map((n, i) => (
        <g key={n.label} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={n.x - 44} y={n.y - 20} width="88" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          {n.label.split('\n').map((line, li) => (
            <text key={line} x={n.x} y={n.y + li * 12} textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
              {line}
            </text>
          ))}
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="188" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Health belief model — barriers and self-efficacy
        </text>
      </g>
    </>
  )
}

function workplaceView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="160" y="40" width="100" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="62" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Leader
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="48" y="108" width="88" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="284" y="108" width="88" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="92" y="130" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Motivation
        </text>
        <text x="328" y="130" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Group norms
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="168" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Job satisfaction · performance · conflict
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="192" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Evaluate leadership style against context
        </text>
      </g>
    </>
  )
}

export function PsychologyDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = '1-1-1-diagnostic-criteria-for-schizophrenia',
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug)
  const family = getFamilyIdForSlug(lessonSlug) ?? 'psych-clinical'

  const view =
    family === 'psych-consumer'
      ? consumerView
      : family === 'psych-health'
        ? healthView
        : family === 'psych-workplace'
          ? workplaceView
          : clinicalView

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Psychology concept diagram"
    >
      {view(spec, stepIndex)}
    </svg>
  )
}
