import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ScoreReveal } from '@/components/mark/ScoreReveal'
import { MarkLineList } from '@/components/mark/MarkLineList'
import { DEMO_MARK_RESULT } from '@/lib/marking/demo-result'
import { DEMO_MARK_RESULT_IB } from '@/lib/marking/demo-result-ib'

/**
 * A worked example of examiner-style marking, on every article.
 *
 * The blog is by far the largest surface — ~550 posts, most of the traffic —
 * and it was entirely prose, ending in a text CTA that pitched "save your
 * subjects, join the conversation". That asks for a signup without ever
 * demonstrating the thing being signed up for.
 *
 * This is editorial as much as promotional: nearly every article is about exam
 * technique, and the single most useful illustration of technique is a mark
 * being withheld for reasoning the student didn't show. The example carries
 * that point better than a paragraph can.
 *
 * Same DEMO_MARK_RESULT as the landing page, the new-user home and
 * /mark?example=1 — one artefact, recognisable wherever a reader meets it.
 */

export function BlogMarkExample({
  slug,
  board = 'cambridge',
}: {
  slug?: string | null
  /** IB articles are kept free of Cambridge references, so they get the IB
   * example — same teaching point, notation the reader will actually meet. */
  board?: 'cambridge' | 'ib'
}) {
  const r = board === 'ib' ? DEMO_MARK_RESULT_IB : DEMO_MARK_RESULT
  const marks = r.ai_marking.marks_awarded
  const lost = marks.find((m) => !m.earned)
  const percentage = Math.round((r.marks_earned / r.total_marks) * 100)
  const href = slug ? `/mark?from=${encodeURIComponent(slug)}` : '/mark'

  return (
    <aside className="ms-blog-mark-example" aria-labelledby="blog-mark-example-h">
      <p className="ms-overline">Worked example</p>
      <h2 id="blog-mark-example-h" className="ms-blog-mark-example__title">
        What a lost mark actually looks like
      </h2>
      <p className="ms-blog-mark-example__lead">
        {board === 'ib'
          ? 'This answer reaches the right coordinates and still drops a mark. The question asks you to justify — and R marks pay for the reasoning, not the conclusion.'
          : 'This answer reaches the right coordinates and still drops a mark — the conclusion is stated, but never justified. Examiners pay for the reasoning, not the answer.'}
      </p>

      <div className="ms-blog-mark-example__body">
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
        <MarkLineList marks={marks} limit={3} />
      </div>

      {lost && (
        <blockquote className="ms-blog-mark-example__why">
          <p className="ms-blog-mark-example__why-label">
            {lost.type} — withheld
          </p>
          <p>{lost.reasoning}</p>
        </blockquote>
      )}

      <p className="ms-blog-mark-example__cta">
        <Link href={href} className="ec-btn-primary inline-flex text-sm">
          Mark your own answer
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Link>
        <span>Free — no account needed for your first one.</span>
      </p>
    </aside>
  )
}
