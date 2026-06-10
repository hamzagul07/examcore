'use client'

import type { DiagramParamSpec } from '@/lib/courses/diagram-specs'

type Props = {
  params: DiagramParamSpec[]
  values: Record<string, number>
  onChange: (id: string, value: number) => void
}

export function DiagramParamControls({ params, values, onChange }: Props) {
  if (!params.length) return null

  return (
    <div className="course-diagram-params" role="group" aria-label="Diagram parameters">
      {params.map((p) => (
        <label key={p.id} className="course-diagram-param">
          <span className="course-diagram-param-label">
            {p.label}
            {p.unit ? <span className="course-diagram-param-unit"> ({p.unit})</span> : null}
          </span>
          <div className="course-diagram-param-row">
            <input
              type="range"
              min={p.min}
              max={p.max}
              step={p.step}
              value={values[p.id] ?? p.default}
              onChange={(e) => onChange(p.id, Number(e.target.value))}
              className="course-diagram-param-slider"
              aria-valuemin={p.min}
              aria-valuemax={p.max}
              aria-valuenow={values[p.id] ?? p.default}
            />
            <output className="course-diagram-param-value">{values[p.id] ?? p.default}</output>
          </div>
        </label>
      ))}
    </div>
  )
}
