'use client'

import { useEffect, useState } from 'react'
import { DIAGRAM_STROKE, DIAGRAM_TEXT } from '@/components/diagrams/diagram-styles'

type Stage = 'lobf' | 'wal'

const STAGE_MS = 4500

/** Paper 5 graph: line of best fit vs worst acceptable line through error bars. */
export function WalErrorBarDiagram({ className = '' }: { className?: string }) {
  const [stage, setStage] = useState<Stage>('lobf')

  useEffect(() => {
    const id = window.setInterval(() => {
      setStage((s) => (s === 'lobf' ? 'wal' : 'lobf'))
    }, STAGE_MS)
    return () => window.clearInterval(id)
  }, [])

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
      <div className="equilibrium-forces-diagram-tabs" role="tablist" aria-label="Graph analysis view">
        <button
          type="button"
          role="tab"
          aria-selected={stage === 'lobf'}
          className={stage === 'lobf' ? 'is-active' : ''}
          onClick={() => setStage('lobf')}
        >
          Line of best fit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={stage === 'wal'}
          className={stage === 'wal' ? 'is-active' : ''}
          onClick={() => setStage('wal')}
        >
          Worst acceptable line
        </button>
      </div>

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

        {stage === 'lobf' ? (
          <line
            x1="65"
            y1="168"
            x2="365"
            y2="38"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            className="eq-anim-vec-a"
          />
        ) : (
          <line
            x1="65"
            y1="148"
            x2="365"
            y2="52"
            stroke={DIAGRAM_STROKE}
            strokeWidth="2.5"
            strokeDasharray="6 4"
            className="eq-anim-vec-b"
          />
        )}

        <text x="210" y="22" textAnchor="middle" fontSize="12" fill={DIAGRAM_TEXT} fontWeight="700">
          {stage === 'lobf'
            ? 'LOBF — balanced scatter above and below'
            : 'WAL — steepest/shallowest line through all error bars'}
        </text>
        <text x="210" y="218" textAnchor="middle" fontSize="11" fill={DIAGRAM_TEXT}>
          Δgradient = |m_LOBF − m_WAL|
        </text>
      </svg>
    </div>
  )
}
