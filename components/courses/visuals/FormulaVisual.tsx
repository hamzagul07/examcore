'use client'

import { useState } from 'react'
import { Sigma } from 'lucide-react'
import type { FormulaPart } from '@/lib/courses/visual-types'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { formatSymbolForMath } from '@/lib/courses/formula-parts'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function FormulaVisual({
  description,
  expressions,
  expression,
  parts,
}: {
  description?: string
  expressions?: string[]
  expression: string
  parts: FormulaPart[]
}) {
  const [active, setActive] = useState(0)
  const part = parts[active] ?? parts[0]
  const lines = expressions?.length ? expressions : [expression]

  return (
    <VisualSectionFrame
      title="Key formula"
      hint="Tap each symbol to see what it means — great for exam definitions."
      icon={Sigma}
      accent="warm"
      className="course-formula-visual"
      bodyClassName="course-formula-visual-body"
    >
      <div className="course-formula-stage">
        <div className="course-formula-card">
          {description ? (
            <div className="course-formula-description">
              <CourseRichText content={description} variant="inline" />
            </div>
          ) : null}
          <div className="course-formula-scroll">
            <div className="course-formula-equations">
              {lines.map((expr) => (
                <div key={expr} className="course-formula-equation">
                  <CourseRichText content={expr} variant="formula" />
                </div>
              ))}
            </div>
          </div>
          <div className="course-formula-chips" role="tablist" aria-label="Formula symbols">
            {parts.map((p, i) => (
              <button
                key={`${p.symbol}-${i}`}
                type="button"
                role="tab"
                aria-selected={active === i}
                onClick={() => setActive(i)}
                className={`course-formula-chip${active === i ? ' is-active' : ''}`}
                style={{ ['--chip-color' as string]: p.color }}
              >
                <span className="course-formula-chip-symbol">
                  <CourseRichText content={formatSymbolForMath(p.symbol)} variant="inline" />
                </span>
              </button>
            ))}
          </div>
        </div>
        <div
          className="course-formula-meaning"
          style={{ ['--chip-color' as string]: part?.color ?? 'var(--course-formula-green)' }}
        >
          <CourseRichText
            content={`${formatSymbolForMath(part?.symbol ?? '')} = ${part?.meaning ?? ''}`}
            variant="inline"
          />
        </div>
      </div>
    </VisualSectionFrame>
  )
}
