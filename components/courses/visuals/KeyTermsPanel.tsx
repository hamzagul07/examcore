'use client'

import { useState } from 'react'
import { BookMarked, ChevronDown } from 'lucide-react'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function KeyTermsPanel({
  title,
  terms,
}: {
  title: string
  terms: { term: string; definition: string }[]
}) {
  const [active, setActive] = useState<number | null>(null)
  const term = active !== null ? terms[active] : null

  function toggle(i: number) {
    setActive((prev) => (prev === i ? null : i))
  }

  return (
    <VisualSectionFrame
      title={title}
      hint="Try to recall each definition before tapping a term to reveal the answer."
      icon={BookMarked}
      accent="brand"
      className="course-key-terms"
    >
      <div className="course-glossary-pills">
        {terms.map((t, i) => (
          <button
            key={`${t.term}-${i}`}
            type="button"
            onClick={() => toggle(i)}
            aria-expanded={active === i}
            className={`course-key-term-pill rounded-full px-4 py-2 text-sm font-semibold transition-colors${
              active === i ? ' is-active' : ''
            }`}
          >
            {t.term}
          </button>
        ))}
      </div>

      {term ? (
        <div className="course-glossary-accordion" id={`term-${active}`}>
          <p className="course-glossary-accordion-term">{term.term}</p>
          <div className="course-glossary-def">
            <CourseRichText content={term.definition} variant="prose" />
          </div>
          <button
            type="button"
            className="course-glossary-collapse"
            onClick={() => setActive(null)}
          >
            <ChevronDown className="h-4 w-4 rotate-180" aria-hidden />
            Hide answer
          </button>
        </div>
      ) : (
        <p className="course-glossary-hint">
          Tap a term above to reveal its definition.
        </p>
      )}
    </VisualSectionFrame>
  )
}
