import { useId } from 'react'
import { CLASS_RETENTION_NOTE } from '@/lib/student/join'

/**
 * What joining a class shares, shown BEFORE the student is enrolled
 * (docs/TEACHER_SYSTEM_SPEC.md §4 `/join/[code]`, lib/student/join.ts).
 *
 * It says exactly what the product does, no more: from the day they join,
 * the teacher sees the work they mark in the class's subject; classmates see
 * nothing of theirs; the teacher never sees their email; and leaving keeps
 * only the marks already handed in on sets. On the signed-out card the class
 * is not known yet, so the teacher and subject are generic.
 */
export function JoinConsentNote({
  teacherName,
  subjectLabel,
  rejoining = false,
  className = '',
}: {
  teacherName?: string | null
  subjectLabel?: string | null
  /** They were in this class before and left; sharing starts again from today. */
  rejoining?: boolean
  className?: string
}) {
  const titleId = useId()
  const who = teacherName?.trim() || 'Your teacher'
  const what = subjectLabel?.trim() ? `in ${subjectLabel.trim()}` : 'in their subject'

  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-[4px] border border-dashed border-[var(--ec-border)] bg-[var(--ec-bg-soft)] px-4 py-3 text-left ${className}`.trim()}
    >
      <h2 id={titleId} className="mb-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--ec-text-secondary)]">
        {rejoining ? 'Before you rejoin' : 'Before you join'}
      </h2>
      <ul className="m-0 list-none space-y-1.5 p-0 text-sm leading-relaxed text-[var(--ec-text-primary)]">
        <li className="flex gap-2">
          <span aria-hidden className="shrink-0 font-mono text-[var(--ec-brand)]">
            ✓
          </span>
          <span>
            {who} will see work you mark on MarkScheme {what} from today: your answers, your marks and the
            examiner notes.
          </span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="shrink-0 font-mono text-[var(--ec-brand)]">
            ✓
          </span>
          <span>Your classmates never see your name or your marks, and your teacher never sees your email address.</span>
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="shrink-0 font-mono text-[var(--ec-brand)]">
            ✓
          </span>
          <span>{CLASS_RETENTION_NOTE} You can leave at any time from your account page.</span>
        </li>
      </ul>
    </section>
  )
}
