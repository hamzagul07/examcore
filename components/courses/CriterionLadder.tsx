'use client'

import { useState } from 'react'
import type { CriterionLadderData } from '@/lib/courses/criterion-ladder.server'
import { CourseRichText } from '@/components/courses/CourseRichText'

/**
 * The criteria this lesson's component is actually marked against, verbatim.
 *
 * For the arts and the languages the criteria ARE the syllabus — a Visual Arts
 * process-portfolio lesson is not about a diagram-able object, it is about what
 * the four criteria reward. This is the picture for exactly the subjects that no
 * drawn family fits.
 *
 * Descriptors are shown word for word and never paraphrased: the wording is the
 * assessment, and a helpful-sounding rewrite would be a different standard.
 * Top band first — students read the top rung to see what they are aiming at,
 * not the bottom one to see what they scraped.
 */
export function CriterionLadder({ data }: { data: CriterionLadderData }) {
  const [open, setOpen] = useState<string | null>(data.criteria[0]?.letter ?? null)

  return (
    <div className="crit-ladder">
      <p className="body-2 crit-ladder-lead">
        <strong>{data.componentLabel}</strong>
        {`${data.maxMarks ? ` · ${data.maxMarks} marks` : ''} — assessed on ${data.criteria.length} ${
          data.criteria.length === 1 ? 'criterion' : 'criteria'
        }. The descriptors below are the examiner's, word for word.`}
      </p>

      <div className="crit-list">
        {data.criteria.map((c) => {
          const isOpen = open === c.letter
          const top = [...c.bands].reverse()
          return (
            <div key={c.letter} className={`crit${isOpen ? ' on' : ''}`}>
              <button
                type="button"
                className="crit-head"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : c.letter)}
              >
                <span className="crit-letter mono">{c.letter}</span>
                <span className="crit-name">{c.name}</span>
                <span className="crit-marks mono">{c.maxMarks}</span>
              </button>
              {isOpen ? (
                <ol className="crit-bands">
                  {top.map((b, i) => (
                    <li key={`${b.marksMin}-${b.marksMax}`} className={i === 0 ? 'crit-band top' : 'crit-band'}>
                      <span className="crit-band-marks mono">
                        {b.marksMin === b.marksMax ? b.marksMin : `${b.marksMin}–${b.marksMax}`}
                      </span>
                      <div className="body-2 crit-band-text">
                        <CourseRichText content={b.descriptor} variant="prose" />
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
