'use client'

/**
 * Explains a mark that moved between the first read and the final result.
 *
 * Showing a provisional score buys back a verify pass of waiting, but it also
 * creates a moment that can only go one of two ways: a student who saw 6/8 and
 * is then handed 5/8 with no explanation has watched the product take a mark
 * off them. Named, the same event reads as the reason to trust it — two passes
 * actually happened, and the second one disagreed.
 *
 * Renders nothing when the mark did not move, which is the common case.
 */
export type ExaminerAdjustmentNoteProps = {
  /** The first-pass score shown during the wait, if one was shown. */
  provisional: number | null
  final: number | null
  total: number | null
}

export function ExaminerAdjustmentNote({
  provisional,
  final,
  total,
}: ExaminerAdjustmentNoteProps) {
  if (provisional == null || final == null) return null
  if (provisional === final) return null

  const wentUp = final > provisional
  const denom = total && total > 0 ? `/${total}` : ''

  return (
    <section className="mb-5 rounded-lg border border-[var(--ec-border)] bg-[var(--ec-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--ec-text-secondary)]">
        Second examiner
      </p>
      <p className="mt-1 text-base font-semibold text-[var(--ec-text-primary)]">
        {wentUp ? 'Adjusted up' : 'Adjusted down'} — {provisional}
        {denom} on the first read, {final}
        {denom} after checking.
      </p>
      <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
        {wentUp
          ? 'The second pass found credit the first read had missed. The breakdown below is the final one.'
          : 'The second pass withdrew a mark the first read had given. The breakdown below shows what it was, and what the scheme wanted instead.'}
      </p>
    </section>
  )
}
