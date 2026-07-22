import { ScoreReveal } from '@/components/mark/ScoreReveal'
import { MarkLineList } from '@/components/mark/MarkLineList'
import { DEMO_MARK_RESULT } from '@/lib/marking/demo-result'

/**
 * Show the product instead of describing it.
 *
 * The landing page had no image, diagram or chart anywhere — every section
 * explained the marking in prose. A visitor deciding in five seconds does not
 * read; they look. And what they are actually buying is a specific artefact:
 * a score, a mark-by-mark verdict, and a sentence explaining the mark they
 * dropped. So render that artefact.
 *
 * Live components rather than a screenshot: it inherits the theme, stays sharp
 * on any display, reflows on mobile, and — the part screenshots always fail —
 * cannot drift out of date when the real result view changes. Fed by
 * DEMO_MARK_RESULT, the same fixture behind /mark?example=1, so the promise on
 * the landing page and the example in the product are one object.
 */

const r = DEMO_MARK_RESULT
const marks = r.ai_marking.marks_awarded

export function LandingMarkPreview({ markHref }: { markHref: string }) {
  const percentage = Math.round((r.marks_earned / r.total_marks) * 100)
  // The lost mark is the point of the section — its reasoning is the product.
  const lost = marks.find((m) => !m.earned)

  return (
    <section
      id="what-you-get"
      className="ms-pg ms-sec scroll-mt-20"
      aria-labelledby="what-you-get-heading"
    >
      <h2 id="what-you-get-heading" className="ms-h2">
        This is what comes back
      </h2>
      <p className="ms-lead" style={{ marginTop: 12 }}>
        A real A-Level Maths answer, marked against the official scheme. Not a
        percentage — the exact mark that got away, and why.
      </p>

      <div className="ms-mark-preview">
        <div className="ms-mark-preview__score">
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
        </div>

        <MarkLineList marks={marks} className="ms-mark-preview__lines" />
      </div>

      {lost && (
        <blockquote className="ms-mark-preview__why">
          <p className="ms-mark-preview__why-label">Why that mark was lost</p>
          <p>{lost.reasoning}</p>
        </blockquote>
      )}

      <p className="ms-mark-preview__cta">
        <a href={markHref} className="ec-btn-primary inline-flex text-sm">
          Mark your own answer
        </a>
        <span>Free, no account needed for your first one.</span>
      </p>
    </section>
  )
}
