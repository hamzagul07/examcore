'use client'

/**
 * Predicted score against awarded score, shown with the result.
 *
 * The gap is the payload, not the score. A student who consistently marks
 * themselves high is walking into the exam believing answers are finished when
 * an examiner would not — and that is invisible from the mark alone, which is
 * why it is worth asking before the reveal rather than inferring afterwards.
 */
export type PredictionGapProps = {
  predicted: number | null
  earned: number | null
  total: number | null
}

export function PredictionGap({ predicted, earned, total }: PredictionGapProps) {
  if (predicted == null || earned == null) return null

  const gap = earned - predicted
  const size = Math.abs(gap)
  const marks = size === 1 ? 'mark' : 'marks'
  const denom = total && total > 0 ? `/${total}` : ''

  const { headline, detail } =
    gap === 0
      ? {
          headline: 'You called it exactly.',
          detail:
            'Reading your own answer accurately is most of the skill — that judgement is what lets you spend the last ten minutes of an exam where it pays.',
        }
      : gap < 0
        ? {
            headline: `You marked yourself ${size} ${marks} high.`,
            detail:
              'This is the gap worth closing. Believing an answer is finished when an examiner would not is what turns a predicted grade into a lower real one — the breakdown below shows exactly which marks you assumed.',
          }
        : {
            headline: `You underrated yourself by ${size} ${marks}.`,
            detail:
              'You are doing more than you think you are. Worth knowing before you spend exam time rewriting answers that were already earning the marks.',
          }

  return (
    <section className="mb-5 rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--ec-text-secondary)]">
        You predicted {predicted}
        {denom} · examiner gave {earned}
        {denom}
      </p>
      <p className="mt-1 text-base font-semibold text-[var(--ec-text-primary)]">
        {headline}
      </p>
      <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">{detail}</p>
    </section>
  )
}
