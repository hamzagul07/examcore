import Link from 'next/link'
import type { ReviewCounts, ReviewFilterOptions, ReviewFilters as Filters, ReviewStatus } from '@/lib/teacher/reviews-query'

const STATUS_OPTIONS: Array<{ value: ReviewStatus; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'overridden', label: 'Re-marked' },
]

/**
 * The inbox filters as a plain `<form method="get">` of selects (spec §4):
 * class, student, set, status. No JavaScript — submitting reloads the server
 * page with the query, so the filter is a link a teacher can bookmark or
 * share with themselves, and it works before hydration. Status options carry
 * their counts (over the other filters).
 *
 * A value that is no longer an option (a set since deleted, say) is still
 * listed as selected, so submitting the form does not silently drop it.
 */
export function ReviewFilters({
  options,
  values,
  counts,
}: {
  options: ReviewFilterOptions
  values: Filters
  counts: ReviewCounts
}) {
  const active = Boolean(values.classroom_id || values.student_id || values.assignment_id || values.status)
  const missing = (list: Array<{ id: string }>, id: string | null) => Boolean(id && !list.some((o) => o.id === id))

  return (
    <form className="ms-review-filters" method="get" action="/teacher/reviews" role="search" aria-label="Filter scripts">
      <label className="ms-review-filters__field">
        <span className="ms-review-filters__label">Class</span>
        <select name="classroom_id" className="ec-input" defaultValue={values.classroom_id ?? ''}>
          <option value="">All classes</option>
          {options.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.archived ? `${c.name} (archived)` : c.name}
            </option>
          ))}
          {missing(options.classes, values.classroom_id) ? (
            <option value={values.classroom_id ?? ''}>Selected class</option>
          ) : null}
        </select>
      </label>

      <label className="ms-review-filters__field">
        <span className="ms-review-filters__label">Student</span>
        <select name="student_id" className="ec-input" defaultValue={values.student_id ?? ''}>
          <option value="">All students</option>
          {options.students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          {missing(options.students, values.student_id) ? (
            <option value={values.student_id ?? ''}>Selected student</option>
          ) : null}
        </select>
      </label>

      <label className="ms-review-filters__field">
        <span className="ms-review-filters__label">Set</span>
        <select name="assignment_id" className="ec-input" defaultValue={values.assignment_id ?? ''}>
          <option value="">Any work</option>
          {options.sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.classroom_name ? `${s.title} — ${s.classroom_name}` : s.title}
            </option>
          ))}
          {missing(options.sets, values.assignment_id) ? (
            <option value={values.assignment_id ?? ''}>Selected set</option>
          ) : null}
        </select>
      </label>

      <label className="ms-review-filters__field">
        <span className="ms-review-filters__label">Status</span>
        <select name="status" className="ec-input" defaultValue={values.status ?? ''}>
          <option value="">All ({counts.total})</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} ({counts[s.value]})
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="ec-btn-primary ms-review-filters__submit inline-flex items-center px-5">
        Filter
      </button>
      {active ? (
        <Link
          href="/teacher/reviews"
          className="ec-btn-ghost ms-review-filters__submit inline-flex items-center justify-center px-4"
        >
          Clear
        </Link>
      ) : null}
    </form>
  )
}
