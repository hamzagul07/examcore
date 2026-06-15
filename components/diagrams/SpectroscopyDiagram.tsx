'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, layerOpacity } from '@/lib/courses/diagram-specs'

const DEFAULT_SLUG = '22-1-infrared-spectroscopy'

export function SpectroscopyDiagram({ className = '', stepIndex = 0, lessonSlug = DEFAULT_SLUG }: LessonDiagramComponentProps) {
  const spec = getLessonDiagramSpec(lessonSlug) ?? getLessonDiagramSpec(DEFAULT_SLUG)
  const mode = lessonSlug.includes('22-2') ? 'ms' : lessonSlug.includes('37-1') ? 'tlc' : lessonSlug.includes('37-2') ? 'glc' : lessonSlug.includes('37-3') ? 'c13' : lessonSlug.includes('37-4') ? 'hnmr' : 'ir'

  return (
    <svg viewBox="0 0 420 220" className={`lesson-diagram-svg ${className}`.trim()} role="img" aria-label="Analytical techniques: spectroscopy and chromatography">
      <text x="210" y="22" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        {mode === 'ir' ? 'Infrared spectroscopy' : mode === 'ms' ? 'Mass spectrometry' : mode === 'tlc' ? 'Thin-layer chromatography' : mode === 'glc' ? 'Gas–liquid chromatography' : mode === 'c13' ? '¹³C NMR' : '¹H NMR'}
      </text>
      <g opacity={layerOpacity(spec, stepIndex, 'step-1')}>
        <line x1="80" y1="150" x2="340" y2="150" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <line x1="80" y1="150" x2="80" y2="60" stroke={DIAGRAM_STROKE} strokeWidth="2" />
        <path d="M 80 130 Q 140 120 200 100 T 320 70" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
        <text x="210" y="168" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>{mode === 'ir' ? 'Wavenumber / cm⁻¹ — fingerprint region' : mode === 'ms' ? 'm/z — molecular ion M⁺ peak' : 'Retention / Rf — separation principle'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-2')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'ir' ? 'O–H ~3300 · C=O ~1700 · C–H ~2900 cm⁻¹' : mode === 'ms' ? 'Fragment peaks — identify functional groups' : mode === 'hnmr' ? 'Chemical shift δ · splitting · integration' : 'Mobile vs stationary phase'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-3')}>
        <text x="210" y="100" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>{mode === 'hnmr' ? 'n+1 rule — neighbours cause splitting' : mode === 'c13' ? 'Distinct C environments — no coupling (decoupled)' : 'Compare to known standards / databases'}</text>
      </g>
      <g opacity={layerOpacity(spec, stepIndex, 'step-4')}>
        <rect x="70" y="142" width="280" height="48" rx="4" fill="color-mix(in srgb, var(--ec-brand) 8%, transparent)" stroke={DIAGRAM_STROKE} strokeWidth="1.5" />
        <text x="210" y="162" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT} fontWeight="600">Combine techniques to deduce structure</text>
        <text x="210" y="180" textAnchor="middle" fontSize="10" fill={DIAGRAM_TEXT}>IR + MS + NMR — systematic approach in Paper 2</text>
      </g>
    </svg>
  )
}
