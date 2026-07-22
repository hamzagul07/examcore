import { Check, X } from 'lucide-react'
import type { MarkAwarded } from '@/components/MarkingResultView'

/**
 * The mark-by-mark verdict rows.
 *
 * Shared by every surface that shows the example mark — landing page, new-user
 * home, blog articles — so a reader who sees it in one place recognises it in
 * the next, and so a change to how a verdict reads happens once. Styling lives
 * in `.ms-mpl`.
 *
 * Verdict is carried by icon AND colour, never colour alone, so it survives
 * greyscale, print and colour vision deficiency.
 */
export function MarkLineList({
  marks,
  limit,
  className = '',
}: {
  marks: MarkAwarded[]
  /** Show only the first N (plus any lost mark, which is always the point). */
  limit?: number
  className?: string
}) {
  const shown = limit ? marks.slice(0, limit) : marks
  const lost = marks.find((m) => !m.earned)
  const includeLost = !!lost && !shown.some((m) => m.mark_id === lost.mark_id)
  const rows = includeLost && lost ? [...shown, lost] : shown

  return (
    <ul className={`ms-mark-lines ${className}`}>
      {rows.map((m, i) => (
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
          <span className="sr-only">
            {m.type} {m.earned ? 'earned' : 'not earned'}
          </span>
        </li>
      ))}
    </ul>
  )
}
