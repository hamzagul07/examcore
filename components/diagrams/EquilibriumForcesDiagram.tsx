'use client'

import { useEffect, useState } from 'react'
import { DIAGRAM_FILL, DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

type Stage = 'moments' | 'triangle'

const STAGE_MS = 5200

export function EquilibriumForcesDiagram({ className = '' }: { className?: string }) {
  const [stage, setStage] = useState<Stage>('moments')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setStage((s) => (s === 'moments' ? 'triangle' : 'moments'))
      setTick((t) => t + 1)
    }, STAGE_MS)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className={`equilibrium-forces-diagram ${className}`.trim()}>
      <div className="equilibrium-forces-diagram-tabs" role="tablist" aria-label="Diagram view">
        <button
          type="button"
          role="tab"
          aria-selected={stage === 'moments'}
          className={stage === 'moments' ? 'is-active' : ''}
          onClick={() => setStage('moments')}
        >
          Principle of moments
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={stage === 'triangle'}
          className={stage === 'triangle' ? 'is-active' : ''}
          onClick={() => setStage('triangle')}
        >
          Triangle of forces
        </button>
      </div>

      {stage === 'moments' ? (
        <svg
          key={`moments-${tick}`}
          viewBox="0 0 420 220"
          className="lesson-diagram-svg equilibrium-forces-diagram-svg"
          role="img"
          aria-label="Beam in rotational equilibrium: clockwise and anticlockwise moments balance"
        >
          <defs>
            <marker id="eq-moment-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
            </marker>
          </defs>
          <polygon points="205,118 195,132 215,132" fill={DIAGRAM_STROKE} />
          <line x1="40" y1="132" x2="380" y2="132" stroke={DIAGRAM_STROKE} strokeWidth="3" />
          <rect x="70" y="108" width="36" height="24" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
          <text x="88" y="124" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
            20 N
          </text>
          <line
            className="eq-anim-force-cw"
            x1="88"
            y1="108"
            x2="88"
            y2="72"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            markerEnd="url(#eq-moment-arrow)"
          />
          <text x="100" y="82" fontSize="11" fill={DIAGRAM_TEXT}>
            2.0 m
          </text>
          <rect x="300" y="108" width="48" height="24" rx="4" fill={DIAGRAM_FILL} stroke={DIAGRAM_STROKE} strokeWidth="2" />
          <text x="324" y="124" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
            40 N
          </text>
          <line
            className="eq-anim-force-acw"
            x1="324"
            y1="108"
            x2="324"
            y2="72"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            markerEnd="url(#eq-moment-arrow)"
          />
          <text x="336" y="82" fontSize="11" fill={DIAGRAM_TEXT}>
            1.0 m
          </text>
          <text x="210" y="168" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
            20 × 2.0 = 40 × 1.0 → balanced
          </text>
          <text x="210" y="188" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT}>
            Σ clockwise moments = Σ anticlockwise moments
          </text>
        </svg>
      ) : (
        <svg
          key={`triangle-${tick}`}
          viewBox="0 0 420 240"
          className="lesson-diagram-svg equilibrium-forces-diagram-svg"
          role="img"
          aria-label="Three coplanar forces form a closed triangle when in equilibrium"
        >
          <defs>
            <marker id="eq-vec-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill={DIAGRAM_STROKE} />
            </marker>
          </defs>
          <text x="210" y="22" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
            Coplanar forces → closed vector triangle
          </text>
          <line
            className="eq-anim-vec-a"
            x1="80"
            y1="170"
            x2="200"
            y2="70"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            markerEnd="url(#eq-vec-arrow)"
          />
          <text x="118" y="108" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
            a
          </text>
          <line
            className="eq-anim-vec-b"
            x1="200"
            y1="70"
            x2="340"
            y2="170"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            markerEnd="url(#eq-vec-arrow)"
          />
          <text x="286" y="108" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
            b
          </text>
          <line
            className="eq-anim-vec-c"
            x1="340"
            y1="170"
            x2="80"
            y2="170"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            markerEnd="url(#eq-vec-arrow)"
          />
          <text x="210" y="192" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="600">
            c
          </text>
          <text x="210" y="222" textAnchor="middle" fontSize="13" fill={DIAGRAM_TEXT} fontWeight="700">
            a + b + c = 0 → translational equilibrium
          </text>
        </svg>
      )}

      <p className="equilibrium-forces-diagram-hint">
        Live diagram — moments balance when CW = ACW; force vectors close tip-to-tail.
      </p>
    </div>
  )
}
