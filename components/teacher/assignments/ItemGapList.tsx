import type { MarkTypeGap } from '@/lib/teacher/cohort-gaps'
import type { ItemGap } from '@/lib/teacher/assignments/progress'
import { NO_DATA } from '@/lib/teacher/stat-display'
import type { AssignmentItem } from '@/lib/teacher/types'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { reviewsHref } from '@/components/teacher/assignments/links'
import { matrixColumns } from '@/components/teacher/assignments/matrix-cells'

/**
 * Where the marks went, item by item (docs/TEACHER_SYSTEM_SPEC.md §4:
 * ItemGapList — mean %, `.ms-gap-track`, top 3 missed notes, "Open N
 * scripts" → reviews filtered by `assignment_id`).
 *
 * Each row: the class mean on the item (the same per-item mean the matrix
 * footer shows), a crimson track for the share of marks lost, and the three
 * points most students missed, in the marker's words. The set's weakest kind
 * of mark leads when there is enough evidence to name one.
 */
export function ItemGapList({
  classroomId,
  assignmentId,
  items,
  gaps,
  headline,
  archived,
}: {
  classroomId: string
  assignmentId: string
  items: readonly AssignmentItem[]
  gaps: readonly ItemGap[]
  headline: MarkTypeGap | null
  archived: boolean
}) {
  const byItem = new Map(gaps.map((g) => [g.item_id, g]))
  const columns = matrixColumns(items)
  const scripts = new Set(gaps.flatMap((g) => g.attempt_ids)).size
  const anyMarked = gaps.some((g) => g.n > 0)

  return (
    <section aria-labelledby="item-gaps-title" className="mb-8">
      <div className="ms-class-due__head">
        <div className="min-w-0">
          <h2 id="item-gaps-title" className="ms-class-due__title">
            Where the marks went
          </h2>
          <p className="ms-class-due__sub">
            {headline
              ? `Weakest kind of mark on this set: ${headline.label} — ${headline.earnedPct}% earned.`
              : 'The class mean on each item, and the points most students missed.'}
          </p>
        </div>
      </div>

      {!anyMarked ? (
        <p className="ms-students-watch__empty">Nothing marked yet — the gaps show once hand-ins are in.</p>
      ) : (
        <ul className="ms-class-due__list">
          {columns.map((col) => {
            const gap = byItem.get(col.item_id)
            const mean = gap && gap.n > 0 && gap.mean_pct !== null ? gap.mean_pct : null
            const lost = mean !== null ? Math.max(0, Math.min(100, Math.round(100 - mean))) : null
            return (
              <li key={col.item_id} className="ms-class-due__row">
                <div className="ms-class-due__row-main">
                  <p className="ms-class-due__name">
                    {col.label} {col.sub ? <span className="ms-class-due__code">{col.sub}</span> : null}
                  </p>
                  <p className="ms-class-due__meta">
                    {gap?.n ?? 0} marked
                    {lost !== null ? ` · ${lost}% of marks lost` : ''}
                  </p>
                  {gap && gap.most_missed.length > 0 ? (
                    <ul className="mt-1.5 flex list-none flex-col gap-1 p-0 text-sm text-[var(--ec-text-secondary)]">
                      {gap.most_missed.map((m) => (
                        <li key={m.note} className="line-clamp-2">
                          <span className="text-[var(--ec-text-primary)]">“{m.note}”</span> — {m.students}{' '}
                          {m.students === 1 ? 'student' : 'students'}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="ms-gap-track" style={{ gridArea: 'bar' }} aria-hidden>
                  {lost !== null ? <div className="ms-gap-fill" style={{ width: `${lost}%` }} /> : null}
                </div>
                <span className="ms-class-due__pct">
                  <span className="sr-only">Class mean </span>
                  {mean !== null ? `${Math.round(mean)}%` : NO_DATA}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {archived ? (
        <p className="ms-class-due__act text-sm text-[var(--ec-text-secondary)]">
          Scripts are not available once a class is archived; the marks above are the ones kept.
        </p>
      ) : scripts > 0 ? (
        <div className="ms-class-due__act">
          <LoadingLink
            href={reviewsHref(classroomId, assignmentId)}
            loadingText="Opening…"
            className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center"
          >
            Open {scripts} {scripts === 1 ? 'script' : 'scripts'}
          </LoadingLink>
        </div>
      ) : null}
    </section>
  )
}
