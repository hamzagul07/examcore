'use client'

import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

function dsmView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const items = ['Symptoms', 'Duration', 'Distress', 'Function']
  return (
    <>
      <text x="210" y="36" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        Diagnostic criteria checklist
      </text>
      {items.map((label, i) => (
        <g key={label} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={48 + i * 84} y="56" width="72" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={84 + i * 84} y="78" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
            {label}
          </text>
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="100" y="112" width="220" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="134" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          DSM / ICD — reliable diagnosis for treatment
        </text>
        <text x="210" y="150" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Rule out alternative explanations · cultural validity
        </text>
      </g>
    </>
  )
}

function diathesisView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="48" width="120" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="108" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Diathesis
        </text>
        <text x="108" y="84" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Genetic · biological vulnerability
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="72" textAnchor="middle" fontSize="14" fill={DIAGRAM_TEXT}>
          +
        </text>
        <rect x="252" y="48" width="120" height="48" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="312" y="68" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Stressor
        </text>
        <text x="312" y="84" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Life events · trauma
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <path d="M 210 96 L 210 128" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="150" y="128" width="120" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="152" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Disorder onset
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="192" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Compare bio vs psycho vs socio-cultural explanations
        </text>
      </g>
    </>
  )
}

function treatmentView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const layers = [
    { x: 48, label: 'Biological', sub: 'Drugs · ECT' },
    { x: 168, label: 'Psychological', sub: 'CBT · psychodynamic' },
    { x: 288, label: 'Social', sub: 'Support · environment' },
  ]
  return (
    <>
      <text x="210" y="32" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        Biopsychosocial treatment
      </text>
      {layers.map((l, i) => (
        <g key={l.label} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={l.x} y="48" width="96" height="56" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={l.x + 48} y="72" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
            {l.label}
          </text>
          <text x={l.x + 48} y="90" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
            {l.sub}
          </text>
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="132" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Evaluate efficacy · side effects · ethics · combination therapy
        </text>
        <text x="210" y="152" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Relapse prevention · patient adherence · cultural sensitivity
        </text>
      </g>
    </>
  )
}

function psychResearchView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="48" width="88" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="92" y="72" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          IV
        </text>
        <path d="M 136 68 L 168 68" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <rect x="168" y="48" width="88" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="212" y="72" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          DV
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="280" y="48" width="100" height="40" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="330" y="72" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Controls · random
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Ethics — consent · debrief · confidentiality
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="152" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Core study evaluation — method · findings · generalisability
        </text>
      </g>
    </>
  )
}

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

function consumerFunnelView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const stages = ['Need', 'Search', 'Evaluate', 'Buy']
  return (
    <>
      <text x="210" y="24" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        Consumer decision process
      </text>
      {stages.map((s, i) => (
        <g key={s} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <polygon
            points={`${120 + i * 56},48 ${168 + i * 56},48 ${176 + i * 56},88 ${112 + i * 56},88`}
            fill={DIAGRAM_FILL}
            stroke={DIAGRAM_STROKE}
            strokeWidth="1.5"
          />
          <text x={144 + i * 56} y="72" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
            {s}
          </text>
          {i < stages.length - 1 ? (
            <path d={`M ${176 + i * 56} 68 L ${120 + (i + 1) * 56} 68`} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          ) : null}
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Post-purchase evaluation · cognitive dissonance
        </text>
        <text x="210" y="140" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          High involvement → more search and comparison
        </text>
      </g>
    </>
  )
}

function consumerRetailView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  return (
    <>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <rect x="48" y="48" width="324" height="100" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="72" y="72" fontSize="8" fill={DIAGRAM_TEXT}>
          Entrance
        </text>
        <text x="210" y="72" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT} fontWeight="600">
          Store layout
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <rect x="120" y="88" width="80" height="40" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="160" y="112" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Hot spots
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="168" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Lighting · music · scent · crowding
        </text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="340" y="72" fontSize="8" fill={DIAGRAM_TEXT}>
          Checkout
        </text>
        <text x="210" y="192" textAnchor="middle" fontSize="8" fill={DIAGRAM_TEXT}>
          Mehrabian — personal space and approach behaviour
        </text>
      </g>
    </>
  )
}

function consumerAdsView(spec: ReturnType<typeof getLessonDiagramSpec>, stepIndex: number) {
  const stages = ['Attention', 'Interest', 'Desire', 'Action']
  return (
    <>
      <text x="210" y="28" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT} fontWeight="600">
        AIDA advertising model
      </text>
      {stages.map((s, i) => (
        <g key={s} opacity={layerOpacity(spec, stepIndex, `step-${i + 1}`)}>
          <rect x={48 + i * 84} y="48" width="72" height="36" rx="6" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
          <text x={84 + i * 84} y="70" textAnchor="middle" fontSize="7" fill={DIAGRAM_TEXT}>
            {s}
          </text>
        </g>
      ))}
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <text x="210" y="120" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          Brand awareness · recognition · loyalty
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
  const family = getFamilyIdForSlug(lessonSlug) ?? 'psych-clinical-dsm'

  const view =
    family === 'psych-consumer-funnel'
      ? consumerFunnelView
      : family === 'psych-consumer-retail'
        ? consumerRetailView
        : family === 'psych-consumer-ads'
          ? consumerAdsView
          : family === 'psych-consumer'
            ? consumerView
            : family === 'psych-health'
        ? healthView
        : family === 'psych-workplace'
          ? workplaceView
          : family === 'psych-clinical-diathesis'
            ? diathesisView
            : family === 'psych-clinical-treatment'
              ? treatmentView
              : family === 'psych-research'
                ? psychResearchView
                : family === 'psych-clinical-dsm'
                  ? dsmView
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
