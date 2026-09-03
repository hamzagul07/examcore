import Link from 'next/link'

import { MarkSnippet } from '@/components/mark/MarkSnippet'
import { ScoreReveal } from '@/components/mark/ScoreReveal'
import { MarkLineList } from '@/components/mark/MarkLineList'
import { edexcelMarkHref } from '@/lib/edexcel/marking'
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
 *
 * No longer blog-only despite the name and the folder: it also runs on the
 * past-paper topic and IB subject pages, which ask a student to write an answer
 * and, until this was added, showed them nothing of what comes back. Those
 * pages pass `showCta={false}` — the answer box is already on screen, and a
 * second "mark your own answer" button next to it competes with the thing it is
 * meant to be selling.
 */

export function BlogMarkExample({
  slug,
  board = 'cambridge',
  showCta = true,
}: {
  slug?: string | null
  /** IB articles get the IB demo. Edexcel IAL posts reuse the point-method demo
   * (method/accuracy) and deep-link into Edexcel marking. */
  board?: 'cambridge' | 'ib' | 'edexcel'
  /** Off where an answer box is already on the page — see the note above. */
  showCta?: boolean
}) {
  const r = board === 'ib' ? DEMO_MARK_RESULT_IB : DEMO_MARK_RESULT
  const marks = r.ai_marking.marks_awarded
  const lost = marks.find((m) => !m.earned)
  const percentage = Math.round((r.marks_earned / r.total_marks) * 100)
  const from = slug ? `from=${encodeURIComponent(slug)}` : ''
  const href =
    board === 'edexcel'
      ? `${edexcelMarkHref('WMA11')}${from ? `&${from}` : ''}`
      : board === 'ib'
        ? `/mark?board=ib${from ? `&${from}` : ''}`
        : slug
          ? `/mark?from=${encodeURIComponent(slug)}`
          : '/mark'

  return (
    <aside className="ms-blog-mark-example" aria-labelledby="blog-mark-example-h">
      <p className="ms-overline">Worked example</p>
      <h2 id="blog-mark-example-h" className="ms-blog-mark-example__title">
        What a lost mark actually looks like
      </h2>
      <p className="ms-blog-mark-example__lead">
        {board === 'ib'
          ? 'This answer reaches the right coordinates and still drops a mark. The question asks you to justify — and R marks pay for the reasoning, not the conclusion.'
          : board === 'edexcel'
            ? 'This answer reaches the right coordinates and still drops a mark — method is partial, so accuracy and follow-through never unlock. Edexcel IAL Maths pays for working, not just the final line.'
            : 'This answer reaches the right coordinates and still drops a mark — the conclusion is stated, but never justified. Examiners pay for the reasoning, not the answer.'}
      </p>

      <div className="ms-blog-mark-example__body">
        <ScoreReveal
          marksEarned={r.marks_earned}
          totalMarks={r.total_marks}
          percentage={percentage}
          grade={null}
          nextGrade={null}
          shareable={false}
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
          <div>
            <MarkSnippet text={lost.reasoning} />
          </div>
        </blockquote>
      )}

      {showCta ? (
        <p className="ms-blog-mark-example__cta">
          <Link href={href} className="ec-btn-primary inline-flex text-sm">
            Mark your own answer
            <span className="ml-1 h-4 w-4" aria-hidden>-&gt;</span>
          </Link>
          <span>Free — no account needed for your first one.</span>
        </p>
      ) : null}
    </aside>
  )
}
