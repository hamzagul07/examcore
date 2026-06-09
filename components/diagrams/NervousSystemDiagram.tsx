'use client'

import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

export function NervousSystemDiagram({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 200"
      className={`lesson-diagram-svg ${className}`.trim()}
      role="img"
      aria-label="Reflex arc: receptor to sensory neurone, relay, motor neurone, effector"
    >
      <circle cx="70" cy="100" r="14" fill={DIAGRAM_STROKE} />
      <text x="70" y="130" textAnchor="middle" fontSize="9" fill={DIAGRAM_TEXT}>
        receptor
      </text>
      <line x1="84" y1="100" x2="150" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-a" />
      <rect x="150" y="85" width="50" height="30" rx="6" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="200" y1="100" x2="260" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2.5" />
      <rect x="260" y="85" width="50" height="30" rx="6" fill="none" stroke={DIAGRAM_STROKE} strokeWidth="2" />
      <line x1="310" y1="100" x2="360" y2="100" stroke={DIAGRAM_STROKE} strokeWidth="2.5" className="eq-anim-vec-b" />
      <text x="375" y="105" fontSize="9" fill={DIAGRAM_TEXT}>
        effector
      </text>
      <text x="210" y="28" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
        Stimulus → CNS → coordinated response via neurones
      </text>
    </svg>
  )
}
