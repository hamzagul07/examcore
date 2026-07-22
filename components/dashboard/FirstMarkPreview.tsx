import Link from 'next/link'
import { ArrowRight, Check, X } from 'lucide-react'
import { ScoreReveal } from '@/components/mark/ScoreReveal'
import { DEMO_MARK_RESULT } from '@/lib/marking/demo-result'

/**
 * What a new account sees instead of three empty boxes.
 *
 * The new-user home showed "Topics tracked —", "Syllabus coverage —", "Grade
 * trend —": three tiles whose only content was an em dash. They told someone
 * who had just signed up, three times over, that they have nothing — and this
 * is the page the large majority of accounts land on, since most have never
 * marked anything.
 *
 * Replaced with the artefact they'd actually receive. Same fixture as the
 * landing page and /mark?example=1, so the product makes one promise in one
 * shape everywhere, and a new user recognises their first real result because
 * they have already seen it.
 */

const r = DEMO_MARK_RESULT
const marks = r.ai_marking.marks_awarded
const lost = marks.find((m) => !m.earned)

export function FirstMarkPreview() {
  const percentage = Math.round((r.marks_earned / r.total_marks) * 100)

  return (
    <div className="ms-first-mark">
      <div className="ms-first-mark__head">
        <div>
          <h3 className="ms-first-mark__title">
            Your first mark comes back like this
          </h3>
          <p className="ms-first-mark__sub">
            A real A-Level Maths answer, marked against the official scheme.
          </p>
        </div>
        <Link href="/mark?example=1" className="ms-first-mark__link">
          See the full example
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="ms-first-mark__body">
        <ScoreReveal
          marksEarned={r.marks_earned}
          totalMarks={r.total_marks}
          percentage={percentage}
          grade={null}
          nextGrade={null}
          marks={marks.map((m, i) => ({
            id: String(m.mark_id ?? i),
            earned: !!m.earned,
            label: m.type?.trim() || `Mark ${i + 1}`,
          }))}
        />

        <ul className="ms-first-mark__lines">
          {marks.slice(0, 3).map((m, i) => (
            <li
              key={String(m.mark_id ?? i)}
              className={`ms-mpl ${m.earned ? 'is-earned' : 'is-lost'}`}
            >
              <span className="ms-mpl__icon" aria-hidden="true">
                {m.earned ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="ms-mpl__type">{m.type}</span>
              <span className="ms-mpl__work">{m.line_reference}</span>
            </li>
          ))}
          {lost && (
            <li className="ms-mpl is-lost">
              <span className="ms-mpl__icon" aria-hidden="true">
                <X className="h-3.5 w-3.5" />
              </span>
              <span className="ms-mpl__type">{lost.type}</span>
              <span className="ms-mpl__work">{lost.line_reference}</span>
            </li>
          )}
        </ul>
      </div>

      {lost?.margin_note && (
        <p className="ms-first-mark__why">
          <strong>Why that mark was lost:</strong> {lost.margin_note}.
        </p>
      )}
    </div>
  )
}
