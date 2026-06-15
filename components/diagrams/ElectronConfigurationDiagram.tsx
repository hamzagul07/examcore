'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '1-3-electrons-energy-levels-and-atomic-orbitals'

/** Shells, orbitals, and ionisation energy for 9701 topics 1.3 and 1.4. */
export function ElectronConfigurationDiagram({
  className = '',
  stepIndex = 0,
  lessonSlug = DEFAULT_SLUG,
}: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const isIe = lessonSlug.includes('1-4')
  const levels = [165, 130, 95, 60]

  return (
    <svg
      viewBox="0 0 420 220"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Electron shells, orbitals, and ionisation energy trends"
    >
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        {isIe ? 'Ionisation energy trends' : 'Shells, subshells, and orbitals'}
      </text>

      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        {levels.map((y, i) => (
          <line key={y} x1="90" y1={y} x2="300" y2={y} stroke={DIAGRAM_STROKE} strokeWidth={i === 0 ? 2.5 : 2} opacity={0.45 + i * 0.15} />
        ))}
        <text x="310" y="168" fontSize="10" fill={DIAGRAM_TEXT}>
          n=1
        </text>
        <text x="310" y="133" fontSize="10" fill={DIAGRAM_TEXT}>
          n=2
        </text>
        <text x="310" y="98" fontSize="10" fill={DIAGRAM_TEXT}>
          n=3
        </text>
        <text x="210" y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isIe ? 'First IE: energy to remove 1 mol outer electrons (gaseous atoms)' : 'Shells n = 1, 2, 3…; subshells s, p, d'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <ellipse cx="160" cy="130" rx="18" ry="28" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <circle cx="250" cy="130" r="14" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <text x="160" y="134" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          p
        </text>
        <text x="250" y="134" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
          s
        </text>
        <text x="210" y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isIe ? 'IE ↑ across period — same shell, more protons' : 'Max 2 electrons per orbital — opposite spins'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="110" y="100" fontSize="10" fill={DIAGRAM_TEXT}>
          1s² 2s² 2p⁶…
        </text>
        <line x1="200" y1="130" x2="200" y2="95" stroke={DIAGRAM_STROKE} strokeWidth="2" markerEnd="url(#ec-arr)" />
        <text x="208" y="110" fontSize="9" fill={DIAGRAM_TEXT}>
          e⁻ removed
        </text>
        <text x="210" y="188" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          {isIe ? 'IE ↓ down group — outer electron farther away' : 'Aufbau order: 1s 2s 2p 3s 3p 4s 3d…'}
        </text>
      </g>

      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">
          {isIe ? 'Dips at Group 2→3 and 5→6 (subshell / repulsion)' : 'Orbital shapes set bonding capacity (s, p, d)'}
        </text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>
          {isIe ? 'Paper 2: explain trends with nuclear charge and radius' : 'Cr/Cu exceptions at A Level'}
        </text>
      </g>

      <defs>
        <marker id="ec-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={DIAGRAM_STROKE} />
        </marker>
      </defs>
    </svg>
  )
}
