import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { MathText } from '@/components/MathText'
import { ScoreReveal } from '@/components/mark/ScoreReveal'
import { MarkLineList } from '@/components/mark/MarkLineList'
import { DEMO_MARK_RESULT } from '@/lib/marking/demo-result'
import { DEMO_MARK_RESULT_IB } from '@/lib/marking/demo-result-ib'
import { isIbBoard } from '@/lib/profile-options'

/**
 * What a new account sees instead of three empty boxes.
 *
 * Same fixtures as the landing page and /mark?example=1 — board-aware so IB
 * students don't get a Cambridge 9709 slip after onboarding.
 */

type Props = {
  board?: string | null
}

export function FirstMarkPreview({ board = null }: Props) {
  const ib = isIbBoard(board ?? '')
  const r = ib ? DEMO_MARK_RESULT_IB : DEMO_MARK_RESULT
  const marks = r.ai_marking.marks_awarded
  const lost = marks.find((m) => !m.earned)
  const percentage = Math.round((r.marks_earned / r.total_marks) * 100)

  return (
    <div className="ms-first-mark">
      <div className="ms-first-mark__head">
        <div>
          <h3 className="ms-first-mark__title">
            Your first mark comes back like this
          </h3>
          <p className="ms-first-mark__sub">
            {ib
              ? 'A Maths AA answer, marked with IB method / accuracy / reasoning notation.'
              : 'A real A-Level Maths answer, marked against the official scheme.'}
          </p>
        </div>
        <Link href="/mark?example=1" className="ms-first-mark__link">
          See the full example -&gt;
        </Link>
      </div>

      <div className="ms-first-mark__body">
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

        <MarkLineList marks={marks} limit={3} className="ms-first-mark__lines" />
      </div>

      {lost?.margin_note && (
        <p className="ms-first-mark__why">
          <strong>Why that mark was lost:</strong>{' '}
          <MathText text={lost.margin_note} />.
        </p>
      )}
    </div>
  )
}
